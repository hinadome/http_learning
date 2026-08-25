import type { ComposedRequest, ParsedHeader, ParsedRequest } from "./types";

const HEADER_LINE = /^([^:\s]+)\s*:\s*(.*)$/;

export function parseHeaderText(headerText: string): ParsedHeader[] {
  const lines = headerText.replace(/\r\n/g, "\n").split("\n");
  const headers: ParsedHeader[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const m = raw.match(HEADER_LINE);
    if (!m) {
      headers.push({ name: "", value: "", raw, line: i + 1 });
      continue;
    }
    headers.push({
      name: m[1],
      value: m[2],
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

export function parseComposedRequest(req: ComposedRequest): ParsedRequest {
  const method = (req.method || "GET").trim().toUpperCase();
  let url = (req.url || "").trim();
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
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
