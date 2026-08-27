/** Shared JWT parse/decode helpers (teach lab + Response panel). */

export interface ParsedJwt {
  raw: string;
  headerSegment: string;
  payloadSegment: string;
  signatureSegment: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

export function extractBearerToken(headerText: string): string | undefined {
  for (const line of headerText.split(/\r?\n/)) {
    const m = line.match(/^authorization\s*:\s*bearer\s+(.+)$/i);
    if (m) return m[1].trim();
  }
  return undefined;
}

export function looksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

export function decodeBase64Url(segment: string): string {
  const pad = segment.length % 4;
  const padded = segment + (pad ? "=".repeat(4 - pad) : "");
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  return atob(b64);
}

export function parseJwt(token: string): ParsedJwt | null {
  if (!looksLikeJwt(token)) return null;
  const [headerSegment, payloadSegment, signatureSegment] = token.split(".");
  try {
    const header = JSON.parse(decodeBase64Url(headerSegment)) as Record<
      string,
      unknown
    >;
    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as Record<
      string,
      unknown
    >;
    return {
      raw: token,
      headerSegment,
      payloadSegment,
      signatureSegment,
      header,
      payload,
    };
  } catch {
    return null;
  }
}

export function jwtExpStatus(payload: Record<string, unknown>): {
  exp?: number;
  expired: boolean;
  expiresAt?: string;
} {
  const exp = payload.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return { expired: false };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    exp,
    expired: exp <= nowSec,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}
