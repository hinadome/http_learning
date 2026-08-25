export interface ParsedSetCookie {
  name: string;
  value: string;
  attributes: Record<string, string | true>;
  raw: string;
}

export interface CookieFinding {
  severity: "info" | "warning" | "error";
  message: string;
}

export interface CookieAnalysis {
  cookie: ParsedSetCookie;
  findings: CookieFinding[];
  summary: string;
  wouldSendOnNextRequest: boolean;
}

function splitSetCookieValue(raw: string): ParsedSetCookie | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(";").map((p) => p.trim());
  const nv = parts[0];
  const eq = nv.indexOf("=");
  if (eq <= 0) return null;
  const name = nv.slice(0, eq).trim();
  const value = nv.slice(eq + 1).trim();
  const attributes: Record<string, string | true> = {};
  for (const part of parts.slice(1)) {
    const i = part.indexOf("=");
    if (i === -1) {
      attributes[part.toLowerCase()] = true;
    } else {
      attributes[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
    }
  }
  return { name, value, attributes, raw: trimmed };
}

export function parseSetCookieHeader(
  values: string | string[]
): ParsedSetCookie[] {
  const list = Array.isArray(values) ? values : [values];
  const out: ParsedSetCookie[] = [];
  for (const v of list) {
    const p = splitSetCookieValue(v);
    if (p) out.push(p);
  }
  return out;
}

export function analyzeSetCookie(
  cookie: ParsedSetCookie,
  context: { requestIsHttps: boolean; crossSite?: boolean } = {
    requestIsHttps: true,
    crossSite: false,
  }
): CookieAnalysis {
  const findings: CookieFinding[] = [];
  const sameSite = String(cookie.attributes.samesite ?? "").toLowerCase();
  const secure = cookie.attributes.secure === true;
  const httpOnly = cookie.attributes.httponly === true;
  const partitioned = cookie.attributes.partitioned === true;

  if (sameSite === "none" && !secure) {
    findings.push({
      severity: "error",
      message: "SameSite=None requires the Secure attribute — browsers reject this cookie.",
    });
  }
  if (secure && !context.requestIsHttps) {
    findings.push({
      severity: "warning",
      message: "Secure cookies are not sent over plain HTTP.",
    });
  }
  if (partitioned && !secure) {
    findings.push({
      severity: "error",
      message: "Partitioned (CHIPS) cookies require Secure.",
    });
  }
  if (context.crossSite && sameSite === "strict") {
    findings.push({
      severity: "info",
      message: "SameSite=Strict — not sent on cross-site subresource or navigation requests.",
    });
  }
  if (context.crossSite && sameSite === "lax") {
    findings.push({
      severity: "info",
      message:
        "SameSite=Lax — sent on top-level cross-site GET navigations, not on cross-site POST/fetch/embed.",
    });
  }
  if (httpOnly) {
    findings.push({
      severity: "info",
      message: "HttpOnly — not readable from JavaScript (document.cookie).",
    });
  }

  const path = cookie.attributes.path;
  if (typeof path === "string") {
    findings.push({
      severity: "info",
      message: `Path=${path} — only sent for URLs under this path prefix.`,
    });
  }

  const wouldSend =
    findings.every((f) => f.severity !== "error") &&
    !(secure && !context.requestIsHttps);

  const summary = wouldSend
    ? `Browser would store "${cookie.name}" and typically send Cookie: ${cookie.name}=… on matching same-site requests.`
    : `Browser may reject or withhold "${cookie.name}" given these attributes.`;

  return { cookie, findings, summary, wouldSendOnNextRequest: wouldSend };
}
