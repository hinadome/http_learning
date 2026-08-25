import { spawn } from "node:child_process";
import { parseComposedRequest } from "../parse";
import { getHttp2PseudoHeaders } from "../encode/http2-frames";
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
import { type SentOnWire } from "./sent";
import { altSvcAdvertisesH3, probeAltSvc } from "./alt-svc";
import { buildQuicHandshakeTimeline } from "../learn/quic-timeline";

function shellQuote(s: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

async function curlSupportsHttp3(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("curl", ["--version"]);
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.on("error", () => resolve(false));
    child.on("close", () => {
      resolve(/HTTP3|http3|nghttp3|quiche/i.test(out));
    });
  });
}

function runCurl(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  code: number | null;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn("curl", args);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    }, REQUEST_TIMEOUT_MS);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      if (stdout.length < MAX_RESPONSE_BYTES) {
        stdout += d.toString();
        if (stdout.length > MAX_RESPONSE_BYTES) {
          stdout = stdout.slice(0, MAX_RESPONSE_BYTES);
        }
      }
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
  });
}

function buildRequestHeaders(req: ComposedRequest): Record<string, string> {
  const parsed = parseComposedRequest(req);
  const pseudo = getHttp2PseudoHeaders(req);
  const headers: Record<string, string> = {
    ":method": pseudo[":method"],
    ":scheme": pseudo[":scheme"],
    ":authority": pseudo[":authority"],
    ":path": pseudo[":path"],
  };
  for (const h of parsed.headers) {
    if (!h.name) continue;
    const lower = h.name.toLowerCase();
    if (
      [
        "connection",
        "transfer-encoding",
        "upgrade",
        "keep-alive",
        "proxy-connection",
        "host",
      ].includes(lower) ||
      lower.startsWith(":")
    ) {
      continue;
    }
    headers[lower] = h.value;
  }
  return headers;
}

async function sendViaCurrentspace(
  req: ComposedRequest,
  steps: LifecycleStep[],
  altSvc: string | null
): Promise<{ response: SendResponse; sent: SentOnWire }> {
  const parsed = parseComposedRequest(req);
  const headers = buildRequestHeaders(req);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@currentspace/http3") as typeof import("@currentspace/http3");

  const port = parsed.target.port || "443";
  const authority = `${parsed.target.hostname}:${port}`;

  steps.push({
    id: "connect",
    label: "QUIC + TLS 1.3 handshake",
    status: "ok",
    detail: `@currentspace/http3 → ${authority}`,
  });

  for (const step of buildQuicHandshakeTimeline({
    hostname: parsed.target.hostname,
    altSvc,
    transport: "currentspace",
  })) {
    if (step.id === "quic-udp" || step.id === "quic-init") {
      steps.push(step);
    }
  }

  const started = Date.now();
  const session = await mod.connectAsync(authority, {
    servername: parsed.target.hostname,
    runtimeMode: "auto",
    connectTimeoutMs: REQUEST_TIMEOUT_MS,
    maxIdleTimeoutMs: REQUEST_TIMEOUT_MS,
  });

  try {
    const stream = session.request(headers, { endStream: !parsed.body });
    if (parsed.body) {
      stream.end(parsed.body);
    }

    const result = await new Promise<{
      status: number;
      statusText: string;
      headers: Record<string, string | string[]>;
      body: string;
      truncated: boolean;
      size: number;
      streamId?: number;
    }>((resolve, reject) => {
      const responseHeaders: Record<string, string | string[]> = {};
      let status = 0;
      let statusText = "";
      const chunks: Buffer[] = [];
      let size = 0;
      let truncated = false;

      stream.on("response", (h: Record<string, string | string[] | number>) => {
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
          label: "HTTP/3 HEADERS (+ DATA) on request stream",
          status: "ok",
          detail: `stream ${stream.id ?? "?"} · :method=${headers[":method"]}`,
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
        resolve({
          status,
          statusText,
          headers: responseHeaders,
          body: Buffer.concat(chunks).toString("utf8"),
          truncated,
          size,
          streamId: typeof stream.id === "number" ? stream.id : undefined,
        });
      });

      stream.on("error", reject);
      setTimeout(
        () => reject(new Error(`HTTP/3 request timed out after ${REQUEST_TIMEOUT_MS}ms`)),
        REQUEST_TIMEOUT_MS
      );
    });

    const ttfb = Date.now() - started;
    steps.push({
      id: "read",
      label: "Read HTTP/3 response",
      status: "ok",
      detail: `${result.status} ${result.statusText}`,
      durationMs: ttfb,
    });

    const responseAlt =
      (Array.isArray(result.headers["alt-svc"])
        ? result.headers["alt-svc"][0]
        : result.headers["alt-svc"]) ?? altSvc;

    const regularHeaders = Object.fromEntries(
      Object.entries(headers).filter(([k]) => !k.startsWith(":"))
    );

    const sent: SentOnWire = {
      curlCommand: [
        "curl",
        "--http3",
        "-X",
        headers[":method"],
        ...Object.entries(regularHeaders).flatMap(([k, v]) => [
          "-H",
          shellQuote(`${k}: ${v}`),
        ]),
        ...(parsed.body ? ["--data-binary", shellQuote(parsed.body)] : []),
        shellQuote(parsed.url),
      ].join(" "),
      headersSent: headers,
      hostPresent: false,
      notes: [
        "Live HTTP/3 via @currentspace/http3 (QUIC + TLS 1.3).",
        "Host is not sent as an HTTP/1-style header; :authority carries the host.",
        "Wire/Binary educational encode shows reconstructed HTTP/3 frames + QPACK (not raw UDP).",
      ],
      protocol: "HTTP/3",
      transport: "currentspace",
      altSvc: responseAlt ? String(responseAlt) : null,
      streamId: result.streamId,
      pseudoHeaders: {
        ":method": headers[":method"],
        ":scheme": headers[":scheme"],
        ":authority": headers[":authority"],
        ":path": headers[":path"],
      },
      quicNotes: [
        "UDP + QUIC connection established",
        "TLS 1.3 completed inside QUIC handshake",
        `Request stream id: ${result.streamId ?? "n/a"}`,
      ],
    };

    return {
      response: {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: result.body,
        bodyTruncated: result.truncated,
        sizeBytes: result.size,
        httpVersionNegotiated: "HTTP/3",
        streamId: result.streamId,
      },
      sent,
    };
  } finally {
    try {
      session.close();
    } catch {
      // ignore
    }
  }
}

async function sendViaCurl(
  req: ComposedRequest,
  steps: LifecycleStep[],
  altSvc: string | null
): Promise<{ response: SendResponse; sent: SentOnWire }> {
  const parsed = parseComposedRequest(req);
  const headers = buildRequestHeaders(req);

  steps.push({
    id: "connect",
    label: "QUIC + HTTP/3 (curl)",
    status: "ok",
    detail: "Using curl --http3",
  });

  for (const step of buildQuicHandshakeTimeline({
    hostname: parsed.target.hostname,
    altSvc,
    transport: "curl",
  }).filter((s) => s.id === "quic-udp" || s.id === "quic-init")) {
    steps.push(step);
  }

  const args = [
    "--http3",
    "-sS",
    "-i",
    "-X",
    parsed.method,
    "--max-time",
    String(Math.ceil(REQUEST_TIMEOUT_MS / 1000)),
  ];

  for (const [k, v] of Object.entries(headers)) {
    if (k.startsWith(":")) continue;
    args.push("-H", `${k}: ${v}`);
  }
  if (parsed.body) args.push("--data-binary", parsed.body);
  args.push(parsed.url);

  const curlCommand = ["curl", ...args.map(shellQuote)].join(" ");
  const started = Date.now();
  const { stdout, stderr, code } = await runCurl(args);

  if (code !== 0) {
    throw new Error(
      `curl --http3 failed (code ${code}): ${stderr.slice(0, 400) || "unknown error"}`
    );
  }

  const blocks = stdout.split(/\r?\n\r?\n/);
  let headerPart = blocks[0] || "";
  let body = blocks.slice(1).join("\n\n");
  let lastHeaderIdx = -1;
  for (let i = 0; i < blocks.length - 1; i++) {
    if (/^HTTP\//i.test(blocks[i])) lastHeaderIdx = i;
  }
  if (lastHeaderIdx >= 0) {
    headerPart = blocks[lastHeaderIdx];
    body = blocks.slice(lastHeaderIdx + 1).join("\n\n");
  }

  const headerLines = headerPart.split(/\r?\n/);
  const statusLine = headerLines[0] || "";
  const statusMatch = statusLine.match(/HTTP\/\S+\s+(\d+)\s*(.*)/i);
  const status = statusMatch ? Number(statusMatch[1]) : 0;
  const statusText = statusMatch ? statusMatch[2] : "";
  const responseHeaders: Record<string, string | string[]> = {};
  for (const line of headerLines.slice(1)) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (responseHeaders[name]) {
      const prev = responseHeaders[name];
      responseHeaders[name] = Array.isArray(prev)
        ? [...prev, value]
        : [prev as string, value];
    } else {
      responseHeaders[name] = value;
    }
  }

  const truncated = body.length >= MAX_RESPONSE_BYTES;
  if (truncated) body = body.slice(0, MAX_RESPONSE_BYTES);

  const responseAlt =
    (Array.isArray(responseHeaders["alt-svc"])
      ? responseHeaders["alt-svc"][0]
      : responseHeaders["alt-svc"]) ?? altSvc;

  steps.push({
    id: "write",
    label: "Write HTTP/3 request",
    status: "ok",
    detail: parsed.method,
  });
  steps.push({
    id: "read",
    label: "Read HTTP/3 response",
    status: "ok",
    detail: `${status} ${statusText}`,
    durationMs: Date.now() - started,
  });

  const sent: SentOnWire = {
    curlCommand,
    headersSent: headers,
    notes: [
      "Live HTTP/3 via curl --http3.",
      "Wire/Binary educational encode shows reconstructed HTTP/3 frames + QPACK.",
    ],
    protocol: /HTTP\/3/i.test(statusLine) ? "HTTP/3" : statusLine.split(" ")[0] || "HTTP/3",
    transport: "curl",
    altSvc: responseAlt ? String(responseAlt) : null,
    pseudoHeaders: {
      ":method": headers[":method"],
      ":scheme": headers[":scheme"],
      ":authority": headers[":authority"],
      ":path": headers[":path"],
    },
    quicNotes: [
      "UDP + QUIC via curl",
      "TLS 1.3 inside QUIC (curl/ngtcp2 or quiche stack)",
    ],
  };

  return {
    response: {
      status,
      statusText,
      headers: responseHeaders,
      body,
      bodyTruncated: truncated,
      sizeBytes: Buffer.byteLength(body, "utf8"),
      httpVersionNegotiated: sent.protocol,
    },
    sent,
  };
}

/**
 * Live HTTP/3: prefer @currentspace/http3, then curl --http3.
 * Always probes Alt-Svc first for learning metadata.
 */
export async function sendHttp3(
  req: ComposedRequest,
  steps: LifecycleStep[]
): Promise<{ response: SendResponse; sent: SentOnWire }> {
  const parsed = parseComposedRequest(req);
  if (parsed.target.protocol !== "https:") {
    throw new Error("HTTP/3 requires https:// (QUIC + TLS 1.3).");
  }
  await assertSafeTarget(parsed.target, req.allowPrivateTargets);

  steps.push({
    id: "dns",
    label: "DNS resolution",
    status: "ok",
    detail: parsed.target.hostname,
  });

  let altSvc: string | null = null;
  try {
    const probe = await probeAltSvc(
      parsed.target.hostname,
      Number(parsed.target.port || 443),
      parsed.pathWithQuery || "/"
    );
    altSvc = probe.altSvc;
    steps.push({
      id: "alt-svc-probe",
      label: "Alt-Svc probe (HTTPS HEAD)",
      status: "ok",
      detail: altSvc
        ? `via ${probe.negotiatedVia}: ${altSvc}`
        : `via ${probe.negotiatedVia}: no Alt-Svc header (may still support h3)`,
    });
    if (altSvc && !altSvcAdvertisesH3(altSvc) && req.sendAnyway !== true) {
      steps.push({
        id: "alt-svc-warn",
        label: "Alt-Svc does not advertise h3",
        status: "skip",
        detail: altSvc,
      });
    }
  } catch (e) {
    steps.push({
      id: "alt-svc-probe",
      label: "Alt-Svc probe (HTTPS HEAD)",
      status: "skip",
      detail: e instanceof Error ? e.message : "probe failed",
    });
  }

  const support = await probeHttp3Support();
  const errors: string[] = [];

  if (support.currentspace) {
    try {
      return await sendViaCurrentspace(req, steps, altSvc);
    } catch (e) {
      errors.push(
        `@currentspace/http3: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  if (support.curlHttp3) {
    try {
      return await sendViaCurl(req, steps, altSvc);
    } catch (e) {
      errors.push(`curl: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(
    [
      "HTTP/3 live send unavailable.",
      errors.length ? errors.join(" | ") : "No H3 transport loaded.",
      "Educational QPACK/frame view still works via Encode.",
      "Install @currentspace/http3 (included) or a curl build with HTTP3.",
    ].join(" ")
  );
}

export async function probeHttp3Support(): Promise<{
  curlHttp3: boolean;
  currentspace: boolean;
}> {
  const curlHttp3 = await curlSupportsHttp3();
  let currentspace = false;
  try {
    require.resolve("@currentspace/http3");
    currentspace = true;
  } catch {
    currentspace = false;
  }
  return { curlHttp3, currentspace };
}
