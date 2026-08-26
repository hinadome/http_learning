import type { ComposedRequest, ParsedHeader, ParsedRequest } from "./types";

/** Regular header: Name: value */
const HEADER_LINE = /^([^:\s]+)\s*:\s*(.*)$/;
/** HTTP/2 pseudo-header: :name: value */
const PSEUDO_HEADER_LINE = /^(\:[a-zA-Z0-9!#$%&'*+\-.^_`|~]+)\s*:\s*(.*)$/;

export function parseHeaderLine(raw: string): { name: string; value: string } | null {
  const pseudo = raw.match(PSEUDO_HEADER_LINE);
  if (pseudo) {
    return { name: pseudo[1], value: pseudo[2] };
  }
  const regular = raw.match(HEADER_LINE);
  if (regular) {
    return { name: regular[1], value: regular[2] };
  }
  return null;
}

export function parseHeaderText(headerText: string): ParsedHeader[] {
  const lines = headerText.replace(/\r\n/g, "\n").split("\n");
  const headers: ParsedHeader[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const parsed = parseHeaderLine(raw);
    if (!parsed) {
      headers.push({ name: "", value: "", raw, line: i + 1 });
      continue;
    }
    headers.push({
      name: parsed.name,
      value: parsed.value,
      raw,
      line: i + 1,
    });
  }
  return headers;
}

export function headersToMap(headers: ParsedHeader[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    if (!h.name) continue;
    const key = h.name.toLowerCase();
    if (map[key] !== undefined) {
      map[key] = `${map[key]}, ${h.value}`;
    } else {
      map[key] = h.value;
    }
  }
  return map;
}

export function normalizeRequestUrl(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function isHttpUrlTarget(target: URL): boolean {
  return target.protocol === "http:" || target.protocol === "https:";
}

export function parseComposedRequest(req: ComposedRequest): ParsedRequest {
  const method = (req.method || "GET").trim().toUpperCase();
  const url = normalizeRequestUrl(req.url || "");
  const target = new URL(url);
  const pathWithQuery = `${target.pathname || "/"}${target.search}`;
  const headers = parseHeaderText(req.headerText || "");
  return {
    version: req.version,
    method,
    url,
    target,
    pathWithQuery,
    headers,
    headerMap: headersToMap(headers),
    body: req.body ?? "",
  };
}

export function getHeader(
  headers: ParsedHeader[],
  name: string
): ParsedHeader | undefined {
  const lower = name.toLowerCase();
  return headers.find((h) => h.name.toLowerCase() === lower);
}

export function hasHeader(headers: ParsedHeader[], name: string): boolean {
  return Boolean(getHeader(headers, name));
}
