import { parseSetCookieHeader } from "./cookies";

const JAR_KEY = "http-learning-checker-cookie-jar";

export interface JarCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  /** Epoch ms; omit if session cookie. */
  expiresAt?: number;
}

export function loadCookieJar(): JarCookie[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(sessionStorage.getItem(JAR_KEY) || "[]") as JarCookie[];
    const now = Date.now();
    return raw.filter((c) => !c.expiresAt || c.expiresAt > now);
  } catch {
    return [];
  }
}

export function saveCookieJar(cookies: JarCookie[]): void {
  sessionStorage.setItem(JAR_KEY, JSON.stringify(cookies.slice(0, 100)));
}

export function clearCookieJar(): void {
  sessionStorage.removeItem(JAR_KEY);
}

export function removeJarCookie(name: string, domain: string, path: string): void {
  saveCookieJar(
    loadCookieJar().filter(
      (c) => !(c.name === name && c.domain === domain && c.path === path)
    )
  );
}

export function updateJarCookie(
  name: string,
  domain: string,
  path: string,
  value: string
): void {
  const jar = loadCookieJar().map((c) =>
    c.name === name && c.domain === domain && c.path === path
      ? { ...c, value }
      : c
  );
  saveCookieJar(jar);
}

/** Cookie header value for all non-expired jar entries (ignores URL match). */
export function jarAsCookieHeader(): string {
  const now = Date.now();
  return loadCookieJar()
    .filter((c) => !c.expiresAt || c.expiresAt > now)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

function domainMatches(cookieDomain: string, host: string): boolean {
  const d = cookieDomain.replace(/^\./, "").toLowerCase();
  const h = host.toLowerCase();
  return h === d || h.endsWith(`.${d}`);
}

function pathMatches(cookiePath: string, reqPath: string): boolean {
  const p = cookiePath || "/";
  if (reqPath === p) return true;
  if (!reqPath.startsWith(p)) return false;
  return p.endsWith("/") || reqPath.charAt(p.length) === "/";
}

/** Merge Set-Cookie values from a response into the jar. */
export function ingestSetCookieHeaders(
  setCookie: string | string[] | undefined,
  requestUrl: string
): JarCookie[] {
  if (!setCookie) return loadCookieJar();
  let host = "";
  let path = "/";
  let isHttps = true;
  try {
    const u = new URL(requestUrl);
    host = u.hostname;
    path = u.pathname || "/";
    isHttps = u.protocol === "https:";
  } catch {
    return loadCookieJar();
  }

  const parsed = parseSetCookieHeader(setCookie);
  let jar = loadCookieJar();

  for (const c of parsed) {
    const domain =
      typeof c.attributes.domain === "string" ? c.attributes.domain : host;
    const cPath =
      typeof c.attributes.path === "string" ? c.attributes.path : path;
    const secure = c.attributes.secure === true;
    if (secure && !isHttps) continue;

    jar = jar.filter(
      (x) =>
        !(
          x.name === c.name &&
          domainMatches(x.domain, domain) &&
          x.path === cPath
        )
    );

    if (c.value === "" || String(c.attributes["max-age"]) === "0") {
      continue;
    }

    let expiresAt: number | undefined;
    if (typeof c.attributes["max-age"] === "string") {
      const sec = parseInt(c.attributes["max-age"], 10);
      if (Number.isFinite(sec)) expiresAt = Date.now() + sec * 1000;
    }

    jar.push({
      name: c.name,
      value: c.value,
      domain,
      path: cPath,
      secure,
      expiresAt,
    });
  }

  saveCookieJar(jar);
  return jar;
}

/** Build Cookie header value for a request URL. */
export function cookieHeaderForUrl(requestUrl: string): string {
  let host = "";
  let path = "/";
  let isHttps = true;
  try {
    const u = new URL(requestUrl);
    host = u.hostname;
    path = u.pathname || "/";
    isHttps = u.protocol === "https:";
  } catch {
    return "";
  }

  const now = Date.now();
  const matches = loadCookieJar().filter((c) => {
    if (c.expiresAt && c.expiresAt <= now) return false;
    if (c.secure && !isHttps) return false;
    if (!domainMatches(c.domain, host)) return false;
    if (!pathMatches(c.path, path)) return false;
    return true;
  });

  return matches.map((c) => `${c.name}=${c.value}`).join("; ");
}

export function upsertCookieHeader(
  headerText: string,
  cookieValue: string
): string {
  if (!cookieValue.trim()) return headerText;
  const lines = headerText.split("\n").filter((l) => {
    return !l.toLowerCase().startsWith("cookie:");
  });
  lines.push(`Cookie: ${cookieValue}`);
  return lines.join("\n");
}
