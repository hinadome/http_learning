import type { ComposedRequest, HttpVersion } from "../types";
import { bufferToHex } from "../encode/bytes";

export interface SentOnWire {
  /** Exact HTTP/1.x text we believe went on the wire (pre-TLS). */
  wireText?: string;
  wireHex?: string;
  /** Equivalent curl reconstructing what was sent. */
  curlCommand: string;
  /** Headers Node (or curl) actually used, after auto-injection rules. */
  headersSent: Record<string, string>;
  /** True if Host was present on the outbound HTTP/1.x message. */
  hostPresent?: boolean;
  notes: string[];
  /** Negotiated / claimed application protocol for this send. */
  protocol?: string;
  /** Live transport used. */
  transport?: "node-http1" | "node-http2" | "currentspace" | "curl";
  /** Alt-Svc advertisement observed (H3 learning). */
  altSvc?: string | null;
  streamId?: number;
  pseudoHeaders?: Record<string, string>;
  quicNotes?: string[];
}

export function buildWireText(
  method: string,
  pathWithQuery: string,
  version: HttpVersion,
  headers: Record<string, string>,
  body: string
): string {
  const versionToken =
    version === "1.0" ? "HTTP/1.0" : version === "1.1" ? "HTTP/1.1" : `HTTP/${version}`;
  const headerLines = Object.entries(headers).map(([k, v]) => `${k}: ${v}`);
  return (
    `${method} ${pathWithQuery} ${versionToken}\r\n` +
    (headerLines.length ? headerLines.join("\r\n") + "\r\n" : "") +
    "\r\n" +
    body
  );
}

export function wireToHex(wire: string): string {
  return bufferToHex(Buffer.from(wire, "utf8"));
}

function shellQuote(s: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function curlFromSent(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string,
  version: HttpVersion,
  extraFlags: string[] = []
): string {
  const parts = ["curl", ...extraFlags];
  if (version === "2") parts.push("--http2");
  if (version === "3") parts.push("--http3");
  // Reproduce intentional missing Host for learning
  const hasHost = Object.keys(headers).some((k) => k.toLowerCase() === "host");
  if (!hasHost && (version === "1.0" || version === "1.1")) {
    parts.push("--http1.1", "-H", shellQuote("Host:"));
  }
  parts.push("-X", method);
  for (const [k, v] of Object.entries(headers)) {
    parts.push("-H", shellQuote(`${k}: ${v}`));
  }
  if (body) parts.push("--data-binary", shellQuote(body));
  parts.push(shellQuote(url));
  return parts.join(" ");
}

export function normalizeOutgoingHeaders(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    if (k.startsWith(":")) continue; // skip http2 pseudo in this helper when listed separately
    out[k] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return out;
}

export function composeSentNote(req: ComposedRequest, sent: SentOnWire): string[] {
  const notes = [...sent.notes];
  if (req.version === "1.0" || req.version === "1.1") {
    if (sent.hostPresent === false) {
      notes.push(
        "Host was intentionally omitted (Send anyway). Node setHost=false so the client did not auto-add it."
      );
    } else if (sent.hostPresent === true) {
      const userHadHost = req.headerText
        .split(/\r?\n/)
        .some((l) => l.toLowerCase().startsWith("host:"));
      if (!userHadHost) {
        notes.push(
          "Host was not in your editor — the client added it automatically for a normal successful request."
        );
      }
    }
  }
  return notes;
}
