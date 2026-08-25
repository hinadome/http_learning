import type { ComposedRequest, HttpVersion } from "../types";
import { rawHttpToComposed, type RawHttpParseResult } from "./raw-http";

/** Minimal curl command parser for common teaching workflows. */
export function parseCurlCommand(curlText: string): RawHttpParseResult | { error: string } {
  let text = curlText.trim();
  if (!text) return { error: "Empty curl command" };

  // Strip line continuations
  text = text.replace(/\\\s*\n/g, " ");

  if (!/^curl(\s|$)/i.test(text)) {
    return { error: 'Expected a command starting with "curl"' };
  }

  let method = "GET";
  let url = "";
  const headers: string[] = [];
  let body = "";
  let version: HttpVersion = "1.1";
  let userPass: string | null = null;

  const tokens = tokenizeCurl(text.replace(/^curl\s+/i, ""));
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "-X" || t === "--request") {
      method = (tokens[++i] ?? "GET").toUpperCase();
      i++;
      continue;
    }
    if (t === "-H" || t === "--header") {
      headers.push(tokens[++i] ?? "");
      i++;
      continue;
    }
    if (t === "-d" || t === "--data" || t === "--data-raw" || t === "--data-binary") {
      body = tokens[++i] ?? "";
      if (method === "GET") method = "POST";
      i++;
      continue;
    }
    if (t === "-u" || t === "--user") {
      userPass = tokens[++i] ?? "";
      i++;
      continue;
    }
    if (t === "--http1.0") {
      version = "1.0";
      i++;
      continue;
    }
    if (t === "--http2") {
      version = "2";
      i++;
      continue;
    }
    if (t === "--http3") {
      version = "3";
      i++;
      continue;
    }
    if (t.startsWith("-")) {
      // skip unknown short/long flags and their value if next token isn't a flag
      i++;
      if (i < tokens.length && !tokens[i].startsWith("-")) i++;
      continue;
    }
    if (!url && /^https?:\/\//i.test(t)) {
      url = t;
    }
    i++;
  }

  if (!url) return { error: "No URL found in curl command" };

  if (userPass) {
    const encoded = Buffer.from(userPass, "utf8").toString("base64");
    headers.push(`Authorization: Basic ${encoded}`);
  }

  const hasHost = headers.some((h) => /^host\s*:/i.test(h));
  if (!hasHost && version !== "2" && version !== "3") {
    try {
      const u = new URL(url);
      headers.unshift(`Host: ${u.host}`);
    } catch {
      /* ignore */
    }
  }

  return {
    method,
    url,
    version,
    headerText: headers.join("\n"),
    body,
  };
}

function tokenizeCurl(args: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (quote) {
      if (c === quote) {
        quote = null;
        out.push(cur);
        cur = "";
      } else if (c === "\\" && quote === '"' && i + 1 < args.length) {
        cur += args[++i];
      } else {
        cur += c;
      }
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      continue;
    }
    if (/\s/.test(c)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

export function curlToComposed(
  parsed: RawHttpParseResult,
  existing?: Partial<ComposedRequest>
): ComposedRequest {
  return rawHttpToComposed(parsed, existing);
}
