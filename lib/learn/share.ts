import type { ComposedRequest } from "../types";

export function encodeSharePayload(req: ComposedRequest): string {
  const json = JSON.stringify(req);
  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeSharePayload(encoded: string): ComposedRequest | null {
  try {
    let json: string;
    if (typeof atob !== "undefined") {
      json = decodeURIComponent(escape(atob(encoded)));
    } else {
      json = Buffer.from(encoded, "base64url").toString("utf8");
    }
    return JSON.parse(json) as ComposedRequest;
  } catch {
    return null;
  }
}

export function buildShareUrl(req: ComposedRequest, origin: string): string {
  return `${origin}/#share=${encodeSharePayload(req)}`;
}

export function parseShareFromHash(hash: string): ComposedRequest | null {
  const m = hash.match(/share=([A-Za-z0-9+/=_-]+)/);
  if (!m) return null;
  return decodeSharePayload(m[1]);
}
