import { createHmac, timingSafeEqual } from "crypto";
import type { ComposedRequest, LifecycleStep, SendResponse } from "../types";
import {
  decodeBase64Url,
  extractBearerToken,
  looksLikeJwt,
  parseJwt,
} from "./jwt-utils";

/** Fixed HS256 secret for the in-app JWT teach lab only — not for production. */
export const TEACH_JWT_SECRET = "http-learning-checker-teach-secret";

export { TEACH_JWT_URL } from "./teach-jwt-tokens";

function bufferToBase64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function verifySignature(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const expected = bufferToBase64Url(
    createHmac("sha256", TEACH_JWT_SECRET).update(signingInput).digest()
  );
  try {
    const a = Buffer.from(signatureSegment, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function errorBody(
  lab: string,
  reason: string,
  detail: Record<string, unknown>
): string {
  return JSON.stringify({ lab, authenticated: false, reason, ...detail }, null, 2);
}

function successBody(parsed: NonNullable<ReturnType<typeof parseJwt>>): string {
  return JSON.stringify(
    {
      lab: "jwt",
      authenticated: true,
      algorithm: parsed.header.alg ?? "unknown",
      subject: parsed.payload.sub ?? null,
      claims: parsed.payload,
      rule: "Authorization: Bearer <JWT> — server verifies signature and exp before accepting.",
    },
    null,
    2
  );
}

/**
 * Educational JWT Bearer validation (HS256, fixed secret).
 * Still HTTP Bearer on the wire; teaches structure, signature, and exp.
 */
export function runTeachJwt(req: ComposedRequest): {
  response: SendResponse;
  notes: string[];
  extraSteps: LifecycleStep[];
} {
  const notes: string[] = [
    "Teach lab (local) — not a network request. Validates Bearer JWT (HS256 + exp).",
    `Teaching secret (HS256 only in this lab): ${TEACH_JWT_SECRET}`,
    "Real APIs use RS256/ES256, JWKS, and short-lived tokens — same Authorization header shape.",
  ];

  const extraSteps: LifecycleStep[] = [
    {
      id: "teach-jwt",
      label: "Teach lab: evaluate Bearer JWT",
      status: "ok",
      detail: "Parse → verify signature → check exp",
    },
  ];

  const bearer = extractBearerToken(req.headerText);

  if (!bearer) {
    notes.push("No Authorization: Bearer → 401 Unauthorized.");
    const body = errorBody("jwt", "missing_bearer", {
      hint: "Add Authorization: Bearer <token> or use the Auth tab → Bearer.",
    });
    return {
      notes,
      extraSteps,
      response: teachResponse(401, "Unauthorized", body, {
        "WWW-Authenticate": 'Bearer realm="teach.local", error="invalid_token"',
      }),
    };
  }

  if (!looksLikeJwt(bearer)) {
    notes.push("Token is not three base64url segments (header.payload.signature) → 400 Bad Request.");
    const body = errorBody("jwt", "malformed_jwt", {
      segments: bearer.split(".").length,
      hint: "JWT must be header.payload.signature — try removing a segment or adding junk.",
    });
    return {
      notes,
      extraSteps,
      response: teachResponse(400, "Bad Request", body),
    };
  }

  let headerAlg: string | undefined;
  try {
    const headerJson = JSON.parse(decodeBase64Url(bearer.split(".")[0]!)) as {
      alg?: string;
    };
    headerAlg = headerJson.alg;
  } catch {
    notes.push("Could not decode JWT header → 400.");
    const body = errorBody("jwt", "invalid_header_encoding", {});
    return {
      notes,
      extraSteps,
      response: teachResponse(400, "Bad Request", body),
    };
  }

  if (headerAlg !== "HS256") {
    notes.push(`Unsupported alg “${headerAlg ?? "(none)"}” in this lab (HS256 only) → 401.`);
    const body = errorBody("jwt", "unsupported_algorithm", {
      algorithm: headerAlg ?? null,
      supported: ["HS256"],
    });
    return {
      notes,
      extraSteps,
      response: teachResponse(401, "Unauthorized", body),
    };
  }

  if (!verifySignature(bearer)) {
    notes.push("HMAC signature mismatch → 401 (token tampered or wrong secret).");
    const body = errorBody("jwt", "invalid_signature", {
      hint: "Change one character in the signature segment and Send again.",
    });
    return {
      notes,
      extraSteps,
      response: teachResponse(401, "Unauthorized", body),
    };
  }

  const parsed = parseJwt(bearer);
  if (!parsed) {
    const body = errorBody("jwt", "invalid_payload_encoding", {});
    return {
      notes,
      extraSteps,
      response: teachResponse(400, "Bad Request", body),
    };
  }

  const exp = parsed.payload.exp;
  if (typeof exp === "number" && exp <= Math.floor(Date.now() / 1000)) {
    notes.push(`exp (${exp}) is in the past → 401 even though signature is valid.`);
    const body = errorBody("jwt", "token_expired", {
      exp,
      expiredAt: new Date(exp * 1000).toISOString(),
      claims: parsed.payload,
    });
    return {
      notes,
      extraSteps,
      response: teachResponse(401, "Unauthorized", body),
    };
  }

  notes.push("Signature valid and token not expired → 200 + decoded claims.");
  const body = successBody(parsed);
  return {
    notes,
    extraSteps,
    response: teachResponse(200, "OK", body),
  };
}

function teachResponse(
  status: number,
  statusText: string,
  body: string,
  extraHeaders?: Record<string, string>
): SendResponse {
  return {
    status,
    statusText,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body,
    bodyTruncated: false,
    sizeBytes: body.length,
    httpVersionNegotiated: "HTTP/1.1 (teach)",
  };
}

export function isTeachJwt(req: ComposedRequest): boolean {
  if (req.teachLab === "jwt") return true;
  try {
    const u = new URL(req.url);
    return u.hostname === "teach.local" && u.pathname.replace(/\/$/, "") === "/jwt";
  } catch {
    return false;
  }
}
