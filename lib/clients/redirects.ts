import type { RedirectHop } from "../types";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function isRedirectStatus(status: number): boolean {
  return REDIRECT_STATUSES.has(status);
}

export function resolveRedirectLocation(
  location: string,
  currentUrl: string
): string {
  return new URL(location, currentUrl).href;
}

export function methodAfterRedirect(
  status: number,
  method: string
): string {
  if (status === 303) return "GET";
  if (status === 302 || status === 301) {
    // Many clients rewrite POST→GET on 302/301; teach conservatively for GET-only lab
    return method === "POST" ? "GET" : method;
  }
  return method;
}

export function buildRedirectHop(
  hop: number,
  url: string,
  status: number,
  statusText: string,
  location: string
): RedirectHop {
  return { hop, url, status, statusText, location };
}
