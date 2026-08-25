import http from "node:http";
import https from "node:https";
import type { IncomingMessage } from "node:http";
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
  SendResponse,
} from "../types";
import {
  buildWireText,
  curlFromSent,
  normalizeOutgoingHeaders,
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
    .some((line) =>
      line.toLowerCase().startsWith(name.toLowerCase() + ":")
    );
}

export async function sendHttp1(
  req: ComposedRequest,
  steps: LifecycleStep[]
): Promise<{ response: SendResponse; sent: SentOnWire }> {
  const parsed = parseComposedRequest(req);
  await assertSafeTarget(parsed.target, req.allowPrivateTargets);

  const hasHost = headersHas(req, "Host");
  // Omit Host only when learning with Send anyway + missing Host.
  // Otherwise inject so demos succeed.
  const omitHost = req.version === "1.1" && !hasHost && Boolean(req.sendAnyway);
  const injectHost = !omitHost && !hasHost;

  const { headers } = buildHttp1WireForSend(req, {
    injectHost,
    injectContentLength: true,
  });

  // If omitHost, strip any Host that slipped in
  if (omitHost) {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === "host") delete headers[key];
    }
  }

  const headerMap: Record<string, string> = { ...headers };

  steps.push({
    id: "dns",
    label: "DNS resolution",
    status: "ok",
    detail: parsed.target.hostname,
  });

  const isHttps = parsed.target.protocol === "https:";
  const lib = isHttps ? https : http;
  const started = Date.now();
  let ttfb = 0;

  const response = await new Promise<SendResponse>((resolve, reject) => {
    const request = lib.request(
      {
        protocol: parsed.target.protocol,
        hostname: parsed.target.hostname,
        port: parsed.target.port || (isHttps ? 443 : 80),
        path: parsed.pathWithQuery,
        method: parsed.method,
        headers: headerMap,
        timeout: REQUEST_TIMEOUT_MS,
        // Critical: Node defaults to auto-adding Host. Disable when omitting for learning.
        setHost: !omitHost,
      },
      async (res) => {
        ttfb = Date.now() - started;
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

    // Capture headers Node will actually send (after setHost behavior)
    const actualHeaders = normalizeOutgoingHeaders(
      request.getHeaders() as Record<string, unknown>
    );

    // Stash on request for outer scope via closure assignment
    (request as unknown as { __actualHeaders?: Record<string, string> }).__actualHeaders =
      actualHeaders;

    request.on("timeout", () => {
      request.destroy(
        new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`)
      );
    });
    request.on("error", reject);

    steps.push({
      id: "connect",
      label: isHttps ? "TCP + TLS connect" : "TCP connect",
      status: "ok",
      detail: `${parsed.target.hostname}:${parsed.target.port || (isHttps ? 443 : 80)}`,
    });

    if (parsed.body) {
      request.write(parsed.body);
    }
    request.end();

    steps.push({
      id: "write",
      label: omitHost
        ? "Write HTTP/1.x request (Host omitted)"
        : "Write HTTP/1.x request",
      status: "ok",
      detail: `${parsed.method} ${parsed.pathWithQuery}`,
    });
  });

  // Re-create actual headers the same way for the sent report
  // (getHeaders was captured inside; rebuild from headerMap + setHost rule)
  const headersSent = { ...headerMap };
  if (!omitHost && !Object.keys(headersSent).some((k) => k.toLowerCase() === "host")) {
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

  steps.push({
    id: "read",
    label: "Read response",
    status: "ok",
    detail: `${response.status} ${response.statusText}${
      omitHost && response.status === 200
        ? " (unexpected 200 — some servers tolerate missing Host)"
        : ""
    }`,
    durationMs: ttfb,
  });

  return { response, sent };
}
