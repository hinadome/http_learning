import { parseComposedRequest } from "../parse";
import type { ComposedRequest, EncodeResult } from "../types";
import { bufferToAsciiPreview, bufferToHex } from "./bytes";

export function encodeHttp1(req: ComposedRequest): EncodeResult {
  const parsed = parseComposedRequest(req);
  const versionToken = parsed.version === "1.0" ? "HTTP/1.0" : "HTTP/1.1";

  const headerLines: string[] = [];
  const seen = new Set<string>();
  for (const h of parsed.headers) {
    if (!h.name) continue;
    headerLines.push(`${h.name}: ${h.value}`);
    seen.add(h.name.toLowerCase());
  }

  // Auto Host for 1.1 if missing (only in encode preview note — validation still errors)
  if (!seen.has("host")) {
    const host =
      parsed.target.port &&
      !(
        (parsed.target.protocol === "https:" && parsed.target.port === "443") ||
        (parsed.target.protocol === "http:" && parsed.target.port === "80")
      )
        ? `${parsed.target.hostname}:${parsed.target.port}`
        : parsed.target.hostname;
    if (parsed.version === "1.1") {
      // keep as typed; don't silently add in wire preview of user input
      void host;
    }
  }

  let body = parsed.body;
  if (body && !seen.has("content-length") && !seen.has("transfer-encoding")) {
    headerLines.push(`Content-Length: ${Buffer.byteLength(body, "utf8")}`);
  }

  const requestLine = `${parsed.method} ${parsed.pathWithQuery} ${versionToken}`;
  const textWire =
    requestLine +
    "\r\n" +
    (headerLines.length ? headerLines.join("\r\n") + "\r\n" : "") +
    "\r\n" +
    body;

  const buf = Buffer.from(textWire, "utf8");

  return {
    version: parsed.version,
    textWire,
    textWireHex: bufferToHex(buf),
    frames: [
      {
        name: "HTTP/1.x message",
        type: "TEXT",
        hex: bufferToHex(buf),
        asciiPreview: bufferToAsciiPreview(buf.slice(0, 200)),
        annotations: [
          {
            offset: 0,
            length: Buffer.byteLength(requestLine + "\r\n", "utf8"),
            label: "Request line",
            detail: requestLine,
          },
        ],
        explanation:
          "HTTP/1.x is a text protocol: request-line, headers, blank line (CRLF CRLF), then optional body.",
      },
    ],
    notes: [
      "Bytes shown are the exact octets the educational client would write on the TCP connection (before TLS encryption).",
      "Header lines end with CRLF (\\r\\n). The empty line after headers ends the header block.",
    ],
  };
}

/** Chunked Transfer-Encoding wire preview (educational). */
export function encodeHttp1Chunked(req: ComposedRequest): EncodeResult {
  const parsed = parseComposedRequest(req);
  const versionToken = parsed.version === "1.0" ? "HTTP/1.0" : "HTTP/1.1";
  const body = parsed.body || "hello";
  const chunkHex = Buffer.byteLength(body, "utf8").toString(16);
  const chunkedBody = `${chunkHex}\r\n${body}\r\n0\r\n\r\n`;

  const headerLines: string[] = [];
  for (const h of parsed.headers) {
    if (!h.name) continue;
    headerLines.push(`${h.name}: ${h.value}`);
  }
  if (
    !headerLines.some((l) => l.toLowerCase().startsWith("transfer-encoding:"))
  ) {
    headerLines.push("Transfer-Encoding: chunked");
  }
  if (!headerLines.some((l) => l.toLowerCase().startsWith("host:"))) {
    headerLines.push(`Host: ${parsed.target.hostname}`);
  }

  const requestLine = `${parsed.method} ${parsed.pathWithQuery} ${versionToken}`;
  const textWire =
    requestLine +
    "\r\n" +
    headerLines.join("\r\n") +
    "\r\n\r\n" +
    chunkedBody;
  const buf = Buffer.from(textWire, "utf8");

  return {
    version: parsed.version,
    textWire,
    textWireHex: bufferToHex(buf),
    frames: [
      {
        name: "HTTP/1.x chunked message",
        type: "TEXT",
        hex: bufferToHex(buf),
        asciiPreview: bufferToAsciiPreview(buf.slice(0, 200)),
        annotations: [
          {
            offset: 0,
            length: Buffer.byteLength(requestLine + "\r\n", "utf8"),
            label: "Request line",
            detail: requestLine,
          },
          {
            offset: textWire.indexOf(chunkedBody),
            length: chunkedBody.length,
            label: "Chunked body",
            detail: "size hex + CRLF + data + … + 0 CRLF CRLF",
          },
        ],
        explanation:
          "Chunked encoding: each chunk is size-in-hex + CRLF + data + CRLF; terminated by 0 + CRLF + CRLF.",
      },
    ],
    notes: [
      "Chunked lab: body is framed in chunks instead of Content-Length.",
      "This app's Send path may still use Content-Length unless Transfer-Encoding is set; use Encode to study wire format.",
    ],
  };
}

/**
 * Educational-only: request with both Content-Length and Transfer-Encoding.
 * Do not Send this to arbitrary targets — Encode to study ambiguity / smuggling risk.
 */
export function encodeHttp1ClTeSmuggle(req: ComposedRequest): EncodeResult {
  const parsed = parseComposedRequest(req);
  const body = parsed.body || "smuggle-demo";
  const headerLines = [
    `Host: ${parsed.target.hostname}`,
    "Transfer-Encoding: chunked",
    `Content-Length: ${Buffer.byteLength(body, "utf8")}`,
    "Content-Type: text/plain",
  ];
  const requestLine = `POST ${parsed.pathWithQuery || "/"} HTTP/1.1`;
  const textWire =
    requestLine + "\r\n" + headerLines.join("\r\n") + "\r\n\r\n" + body;
  const buf = Buffer.from(textWire, "utf8");

  return {
    version: "1.1",
    textWire,
    textWireHex: bufferToHex(buf),
    frames: [
      {
        name: "Ambiguous CL + TE message",
        type: "TEXT",
        hex: bufferToHex(buf),
        asciiPreview: bufferToAsciiPreview(buf.slice(0, 200)),
        annotations: [
          {
            offset: textWire.indexOf("Transfer-Encoding"),
            length: "Transfer-Encoding: chunked".length,
            label: "Transfer-Encoding",
          },
          {
            offset: textWire.indexOf("Content-Length"),
            length: `Content-Length: ${Buffer.byteLength(body, "utf8")}`.length,
            label: "Content-Length",
          },
        ],
        explanation:
          "Both framing headers present. Front-ends and origins may disagree which wins — the root of classic request smuggling.",
      },
    ],
    notes: [
      "ENCODE-ONLY teaching lab. Validation treats CL+TE as an error; do not Send to production systems.",
      "RFC 9112: a sender must not generate a message with both Content-Length and Transfer-Encoding.",
      "Study smuggling conceptually; never use this pattern to attack systems you do not own.",
    ],
  };
}

/** Build wire message used when actually sending (may inject Host / Content-Length). */
export function buildHttp1WireForSend(
  req: ComposedRequest,
  opts?: { injectHost?: boolean; injectContentLength?: boolean }
): { wire: string; headers: Record<string, string> } {
  const parsed = parseComposedRequest(req);
  const versionToken = parsed.version === "1.0" ? "HTTP/1.0" : "HTTP/1.1";
  const headers: Record<string, string> = {};
  for (const h of parsed.headers) {
    if (!h.name) continue;
    headers[h.name] = h.value;
  }

  const lowerKeys = new Set(Object.keys(headers).map((k) => k.toLowerCase()));

  if (opts?.injectHost !== false && !lowerKeys.has("host")) {
    const host =
      parsed.target.port &&
      !(
        (parsed.target.protocol === "https:" && parsed.target.port === "443") ||
        (parsed.target.protocol === "http:" && parsed.target.port === "80")
      )
        ? `${parsed.target.hostname}:${parsed.target.port}`
        : parsed.target.hostname;
    headers.Host = host;
    lowerKeys.add("host");
  }

  const body = parsed.body;
  if (
    opts?.injectContentLength !== false &&
    body &&
    !lowerKeys.has("content-length") &&
    !lowerKeys.has("transfer-encoding")
  ) {
    headers["Content-Length"] = String(Buffer.byteLength(body, "utf8"));
  }

  const headerLines = Object.entries(headers).map(([k, v]) => `${k}: ${v}`);
  const requestLine = `${parsed.method} ${parsed.pathWithQuery} ${versionToken}`;
  const wire =
    requestLine +
    "\r\n" +
    (headerLines.length ? headerLines.join("\r\n") + "\r\n" : "") +
    "\r\n" +
    body;

  return { wire, headers };
}
