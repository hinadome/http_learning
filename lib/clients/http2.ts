import http2 from "node:http2";
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
  TlsInfo,
} from "../types";
import { extractTlsInfo } from "../tls/inspect";
import { getHttp2PseudoHeaders } from "../encode/http2-frames";
import { curlFromSent, type SentOnWire } from "./sent";

const FORBIDDEN = new Set([
  "connection",
  "transfer-encoding",
  "upgrade",
  "keep-alive",
  "proxy-connection",
  "host",
]);

export async function sendHttp2(
  req: ComposedRequest,
  steps: LifecycleStep[]
): Promise<{ response: SendResponse; sent: SentOnWire; tlsInfo?: TlsInfo }> {
  const parsed = parseComposedRequest(req);
  if (parsed.target.protocol !== "https:") {
    throw new Error("HTTP/2 client in this app requires https:// (ALPN h2 over TLS).");
  }
  await assertSafeTarget(parsed.target, req.allowPrivateTargets);

  const pseudo = getHttp2PseudoHeaders(req);
  const headers: Record<string, string> = {
    ":method": pseudo[":method"],
    ":scheme": pseudo[":scheme"],
    ":path": pseudo[":path"],
    ":authority": pseudo[":authority"],
  };

  for (const h of parsed.headers) {
    if (!h.name) continue;
    const lower = h.name.toLowerCase();
    if (FORBIDDEN.has(lower) || lower.startsWith(":")) continue;
    headers[lower] = h.value;
  }

  const headersSent = { ...headers };
  const sent: SentOnWire = {
    curlCommand: curlFromSent(
      parsed.url,
      parsed.method,
      Object.fromEntries(
        Object.entries(headersSent).filter(([k]) => !k.startsWith(":"))
      ),
      parsed.body,
      "2"
    ),
    headersSent,
    notes: [
      "HTTP/2 does not send a text Host header; :authority carries the host.",
      "curl below approximates the request; the Wire tab educational encode shows HPACK frames.",
      `Pseudo-headers sent: ${Object.entries(pseudo)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    ],
    protocol: "HTTP/2",
    transport: "node-http2",
    pseudoHeaders: {
      ":method": headers[":method"],
      ":scheme": headers[":scheme"],
      ":authority": headers[":authority"],
      ":path": headers[":path"],
    },
  };

  steps.push({
    id: "dns",
    label: "DNS resolution",
    status: "ok",
    detail: parsed.target.hostname,
  });

  const authority = `${parsed.target.hostname}:${parsed.target.port || 443}`;
  const client = http2.connect(`https://${authority}`, {
    timeout: REQUEST_TIMEOUT_MS,
  });

  const started = Date.now();

  try {
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("error", reject);
      setTimeout(
        () => reject(new Error("HTTP/2 connect timeout")),
        REQUEST_TIMEOUT_MS
      );
    });

    steps.push({
      id: "connect",
      label: "TCP + TLS + ALPN h2",
      status: "ok",
      detail: `Connected to ${authority}`,
    });

    const tlsInfo = extractTlsInfo(client.socket);

    const response = await new Promise<SendResponse>((resolve, reject) => {
      const stream = client.request(headers, { endStream: !parsed.body });
      const responseHeaders: Record<string, string | string[]> = {};
      let status = 0;
      let statusText = "";
      const chunks: Buffer[] = [];
      let size = 0;
      let truncated = false;
      let ttfb = 0;

      stream.on("response", (h) => {
        ttfb = Date.now() - started;
        for (const [k, v] of Object.entries(h)) {
          if (v === undefined) continue;
          if (k === ":status") {
            status = Number(v);
            statusText = String(v);
          } else {
            responseHeaders[k] = v as string | string[];
          }
        }
        steps.push({
          id: "write",
          label: "HTTP/2 HEADERS (+ DATA)",
          status: "ok",
          detail: `stream opened, :method=${headers[":method"]}`,
        });
      });

      stream.on("data", (chunk: Buffer) => {
        if (size >= MAX_RESPONSE_BYTES) {
          truncated = true;
          return;
        }
        const remaining = MAX_RESPONSE_BYTES - size;
        const slice =
          chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
        chunks.push(slice);
        size += slice.length;
        if (chunk.length > remaining) truncated = true;
      });

      stream.on("end", () => {
        steps.push({
          id: "read",
          label: "Read HTTP/2 response",
          status: "ok",
          detail: `status ${status}`,
          durationMs: ttfb,
        });
        resolve({
          status,
          statusText,
          headers: responseHeaders,
          body: Buffer.concat(chunks).toString("utf8"),
          bodyTruncated: truncated,
          sizeBytes: size,
          httpVersionNegotiated: "HTTP/2",
          streamId: stream.id,
        });
      });

      stream.on("error", reject);
      stream.setTimeout(REQUEST_TIMEOUT_MS, () => {
        stream.close();
        reject(new Error(`HTTP/2 request timed out after ${REQUEST_TIMEOUT_MS}ms`));
      });

      if (parsed.body) {
        stream.end(parsed.body);
      }
    });

    return { response, sent, tlsInfo };
  } finally {
    client.close();
  }
}
