import http from "node:http";
import https from "node:https";
import type { IncomingMessage, ClientRequest } from "node:http";
import { buildHttp1WireForSend } from "../encode/http1";
import { parseComposedRequest } from "../parse";
import {
  MAX_RESPONSE_BYTES,
  REQUEST_TIMEOUT_MS,
  assertSafeTarget,
} from "../safety";
import type {
  ComposedRequest,
  LifecycleStep,
  RedirectHop,
  SendResponse,
  TlsInfo,
} from "../types";
import { extractTlsInfo } from "../tls/inspect";
import {
  buildRedirectHop,
  isRedirectStatus,
  methodAfterRedirect,
  resolveRedirectLocation,
} from "./redirects";
import {
  buildWireText,
  curlFromSent,
  type SentOnWire,
  wireToHex,
} from "./sent";

function collectBody(res: IncomingMessage): Promise<{
  body: string;
  size: number;
  truncated: boolean;
}> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let truncated = false;
    res.on("data", (chunk: Buffer) => {
      if (size >= MAX_RESPONSE_BYTES) {
        truncated = true;
        return;
      }
      const remaining = MAX_RESPONSE_BYTES - size;
      const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
      chunks.push(slice);
      size += slice.length;
      if (chunk.length > remaining) truncated = true;
    });
    res.on("end", () => {
      resolve({
        body: Buffer.concat(chunks).toString("utf8"),
        size,
        truncated,
      });
    });
    res.on("error", reject);
  });
}

function headersHas(req: ComposedRequest, name: string): boolean {
  return req.headerText
    .split(/\r?\n/)
    .some((line) => line.toLowerCase().startsWith(name.toLowerCase() + ":"));
}

interface SingleSendResult {
  response: SendResponse;
  sent: SentOnWire;
  ttfbMs: number;
  connectMs: number;
  tlsInfo?: TlsInfo;
}

async function sendHttp1Once(
  req: ComposedRequest,
  urlOverride?: string
): Promise<SingleSendResult> {
  const working = urlOverride
    ? { ...req, url: urlOverride }
    : req;
  const parsed = parseComposedRequest(working);
  await assertSafeTarget(parsed.target, req.allowPrivateTargets);

  const hasHost = headersHas(working, "Host");
  const omitHost =
    working.version === "1.1" && !hasHost && Boolean(working.sendAnyway);
  const injectHost = !omitHost && !hasHost;

  const { headers } = buildHttp1WireForSend(working, {
    injectHost,
    injectContentLength: true,
  });

  if (omitHost) {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === "host") delete headers[key];
    }
  }

  const headerMap: Record<string, string> = { ...headers };
  const isHttps = parsed.target.protocol === "https:";
  const lib = isHttps ? https : http;
  const started = Date.now();
  let connectMs = 0;
  let ttfbMs = 0;
  let tlsInfo: TlsInfo | undefined;

  const response = await new Promise<SendResponse>((resolve, reject) => {
    const request: ClientRequest = lib.request(
      {
        protocol: parsed.target.protocol,
        hostname: parsed.target.hostname,
        port: parsed.target.port || (isHttps ? 443 : 80),
        path: parsed.pathWithQuery,
        method: parsed.method,
        headers: headerMap,
        timeout: REQUEST_TIMEOUT_MS,
        setHost: !omitHost,
      },
      async (res) => {
        ttfbMs = Date.now() - started;
        try {
          const collected = await collectBody(res);
          const rh: Record<string, string | string[]> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (v !== undefined) rh[k] = v;
          }
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? "",
            headers: rh,
            body: collected.body,
            bodyTruncated: collected.truncated,
            sizeBytes: collected.size,
            httpVersionNegotiated: `HTTP/${res.httpVersion}`,
          });
        } catch (e) {
          reject(e);
        }
      }
    );

    request.on("socket", (socket) => {
      socket.on("connect", () => {
        connectMs = Date.now() - started;
      });
      socket.on("secureConnect", () => {
        tlsInfo = extractTlsInfo(socket);
      });
    });

    request.on("timeout", () => {
      request.destroy(
        new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`)
      );
    });
    request.on("error", reject);

    if (parsed.body) {
      request.write(parsed.body);
    }
    request.end();
  });

  const headersSent = { ...headerMap };
  if (
    !omitHost &&
    !Object.keys(headersSent).some((k) => k.toLowerCase() === "host")
  ) {
    const host =
      parsed.target.port &&
      !(
        (parsed.target.protocol === "https:" && parsed.target.port === "443") ||
        (parsed.target.protocol === "http:" && parsed.target.port === "80")
      )
        ? `${parsed.target.hostname}:${parsed.target.port}`
        : parsed.target.hostname;
    headersSent.Host = host;
  }

  const wireText = buildWireText(
    parsed.method,
    parsed.pathWithQuery,
    parsed.version === "1.0" ? "1.0" : "1.1",
    headersSent,
    parsed.body
  );

  const hostPresent = Object.keys(headersSent).some(
    (k) => k.toLowerCase() === "host"
  );

  const notes: string[] = [
    "Wire text below is the HTTP/1.x message constructed for the socket (TLS still encrypts the bytes on the network).",
  ];
  if (omitHost) {
    notes.push(
      "Send anyway + missing Host: setHost=false, so Host was not auto-added by Node."
    );
  }

  const sent: SentOnWire = {
    wireText,
    wireHex: wireToHex(wireText),
    curlCommand: curlFromSent(
      parsed.url,
      parsed.method,
      headersSent,
      parsed.body,
      parsed.version === "1.0" ? "1.0" : "1.1"
    ),
    headersSent,
    hostPresent,
    notes,
    protocol: parsed.version === "1.0" ? "HTTP/1.0" : "HTTP/1.1",
    transport: "node-http1",
  };

  return { response, sent, ttfbMs, connectMs, tlsInfo };
}

function getLocationHeader(
  headers: Record<string, string | string[]>
): string | undefined {
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === "location") {
      return Array.isArray(v) ? v[0] : v;
    }
  }
  return undefined;
}

export async function sendHttp1(
  req: ComposedRequest,
  steps: LifecycleStep[]
): Promise<{
  response: SendResponse;
  sent: SentOnWire;
  redirectChain?: RedirectHop[];
  finalUrl?: string;
  tlsInfo?: TlsInfo;
  timingExtra?: { connectMs?: number; ttfbMs?: number };
}> {
  const parsed = parseComposedRequest(req);
  steps.push({
    id: "dns",
    label: "DNS resolution",
    status: "ok",
    detail: parsed.target.hostname,
  });

  const isHttps = parsed.target.protocol === "https:";
  steps.push({
    id: "connect",
    label: isHttps ? "TCP + TLS connect" : "TCP connect",
    status: "ok",
    detail: `${parsed.target.hostname}:${parsed.target.port || (isHttps ? 443 : 80)}`,
  });

  const omitHost =
    req.version === "1.1" && !headersHas(req, "Host") && Boolean(req.sendAnyway);

  steps.push({
    id: "write",
    label: omitHost
      ? "Write HTTP/1.x request (Host omitted)"
      : "Write HTTP/1.x request",
    status: "ok",
    detail: `${req.method} ${parsed.pathWithQuery}`,
  });

  const maxRedirects = req.maxRedirects ?? 5;
  const redirectChain: RedirectHop[] = [];
  let currentUrl = req.url;
  let currentMethod = req.method;
  let currentBody = req.body;
  let result = await sendHttp1Once({
    ...req,
    method: currentMethod,
    body: currentBody,
    url: currentUrl,
  });

  let hop = 0;
  while (
    req.followRedirects &&
    isRedirectStatus(result.response.status) &&
    hop < maxRedirects
  ) {
    const location = getLocationHeader(result.response.headers);
    if (!location) break;

    const nextUrl = resolveRedirectLocation(location, currentUrl);
    hop += 1;
    redirectChain.push(
      buildRedirectHop(
        hop,
        currentUrl,
        result.response.status,
        result.response.statusText,
        location
      )
    );

    currentMethod = methodAfterRedirect(result.response.status, currentMethod);
    if (currentMethod === "GET") currentBody = "";

    steps.push({
      id: `redirect-${hop}`,
      label: `Follow redirect ${result.response.status} → ${location}`,
      status: "ok",
      detail: nextUrl,
    });

    currentUrl = nextUrl;
    result = await sendHttp1Once(
      {
        ...req,
        method: currentMethod,
        body: currentBody,
        url: currentUrl,
      },
      currentUrl
    );
  }

  steps.push({
    id: "read",
    label: redirectChain.length
      ? `Read final response (after ${redirectChain.length} redirect(s))`
      : "Read response",
    status: "ok",
    detail: `${result.response.status} ${result.response.statusText}${
      omitHost && result.response.status === 200
        ? " (unexpected 200 — some servers tolerate missing Host)"
        : ""
    }`,
    durationMs: result.ttfbMs,
  });

  return {
    response: result.response,
    sent: result.sent,
    redirectChain: redirectChain.length ? redirectChain : undefined,
    finalUrl: redirectChain.length ? currentUrl : undefined,
    tlsInfo: result.tlsInfo,
    timingExtra: {
      connectMs: result.connectMs,
      ttfbMs: result.ttfbMs,
    },
  };
}
