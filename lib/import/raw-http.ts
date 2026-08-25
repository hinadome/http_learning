import type { ComposedRequest, HttpVersion } from "../types";

export interface RawHttpParseResult {
  method: string;
  url: string;
  version: HttpVersion;
  headerText: string;
  body: string;
}

function normalizeVersion(token: string): HttpVersion | null {
  const v = token.replace(/^HTTP\//i, "").trim();
  if (v === "1.0") return "1.0";
  if (v === "1.1") return "1.1";
  if (v === "2" || v === "2.0") return "2";
  if (v === "3") return "3";
  return null;
}

/** Parse a raw HTTP/1.x request message (request line + headers + optional body). */
export function parseRawHttpRequest(
  text: string,
  baseUrl?: string
): RawHttpParseResult | { error: string } {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return { error: "Empty input" };

  const parts = normalized.split("\n\n");
  const head = parts[0];
  const body = parts.slice(1).join("\n\n");

  const lines = head.split("\n");
  const requestLine = lines[0]?.trim() ?? "";
  const match = requestLine.match(/^(\S+)\s+(\S+)\s+(HTTP\/[\d.]+)$/i);
  if (!match) {
    return {
      error:
        "Expected request line: METHOD /path HTTP/1.1 (or paste a full message with headers)",
    };
  }

  const method = match[1].toUpperCase();
  const target = match[2];
  const version = normalizeVersion(match[3]);
  if (!version || version === "2" || version === "3") {
    return {
      error:
        "Raw paste supports HTTP/1.0 and HTTP/1.1 request text. Use version selector for H2/H3 after import.",
    };
  }

  let url: string;
  if (/^https?:\/\//i.test(target)) {
    url = target;
  } else if (baseUrl) {
    try {
      url = new URL(target, baseUrl).href;
    } catch {
      return { error: `Invalid path "${target}" — provide a base URL or use an absolute URL` };
    }
  } else {
    const hostLine = lines
      .slice(1)
      .find((l) => /^host\s*:/i.test(l.trim()));
    if (!hostLine) {
      return {
        error:
          'Relative path without Host — include a Host header or use an absolute URL in the request line',
      };
    }
    const host = hostLine.replace(/^host\s*:\s*/i, "").trim();
    const scheme = host.includes("localhost") ? "http" : "https";
    url = `${scheme}://${host}${target.startsWith("/") ? target : `/${target}`}`;
  }

  const headerLines = lines.slice(1).filter((l) => l.trim());
  return {
    method,
    url,
    version,
    headerText: headerLines.join("\n"),
    body,
  };
}

export function rawHttpToComposed(
  parsed: RawHttpParseResult,
  existing?: Partial<ComposedRequest>
): ComposedRequest {
  return {
    version: parsed.version,
    method: parsed.method,
    url: parsed.url,
    headerText: parsed.headerText,
    body: parsed.body,
    sendAnyway: existing?.sendAnyway ?? false,
    allowPrivateTargets: existing?.allowPrivateTargets ?? false,
    followRedirects: existing?.followRedirects ?? false,
    maxRedirects: existing?.maxRedirects ?? 5,
  };
}
