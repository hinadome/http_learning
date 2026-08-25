import type { ComposedRequest } from "../types";
import { parseComposedRequest } from "../parse";

/** Browser-safe HTTP/1.x text message (no Node Buffer). */
export function toRawHttp1(req: ComposedRequest): string {
  const parsed = parseComposedRequest(req);
  const versionToken = req.version === "1.0" ? "HTTP/1.0" : "HTTP/1.1";
  const lines: string[] = [];
  let hasCl = false;
  let hasTe = false;
  for (const h of parsed.headers) {
    if (!h.name) continue;
    lines.push(`${h.name}: ${h.value}`);
    const lower = h.name.toLowerCase();
    if (lower === "content-length") hasCl = true;
    if (lower === "transfer-encoding") hasTe = true;
  }
  if (parsed.body && !hasCl && !hasTe) {
    lines.push(`Content-Length: ${new TextEncoder().encode(parsed.body).length}`);
  }
  return (
    `${parsed.method} ${parsed.pathWithQuery} ${versionToken}\r\n` +
    (lines.length ? lines.join("\r\n") + "\r\n" : "") +
    "\r\n" +
    parsed.body
  );
}

export function toCurl(req: ComposedRequest): string {
  const parsed = parseComposedRequest(req);
  const parts = ["curl"];

  if (req.version === "2") parts.push("--http2");
  if (req.version === "3") parts.push("--http3");

  parts.push("-X", parsed.method);

  for (const h of parsed.headers) {
    if (!h.name) continue;
    parts.push("-H", shellQuote(`${h.name}: ${h.value}`));
  }

  if (parsed.body) {
    parts.push("--data-binary", shellQuote(parsed.body));
  }

  parts.push(shellQuote(parsed.url));
  return parts.join(" ");
}

export function toFetch(req: ComposedRequest): string {
  const parsed = parseComposedRequest(req);
  const headers: Record<string, string> = {};
  for (const h of parsed.headers) {
    if (!h.name) continue;
    headers[h.name] = h.value;
  }

  const init: Record<string, unknown> = {
    method: parsed.method,
    headers,
  };
  if (parsed.body && parsed.method !== "GET" && parsed.method !== "HEAD") {
    init.body = parsed.body;
  }

  return `await fetch(${JSON.stringify(parsed.url)}, ${JSON.stringify(
    init,
    null,
    2
  )});`;
}

function shellQuote(s: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
