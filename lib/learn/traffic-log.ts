import type { TrafficEntry } from "../types";

const SESSION_KEY = "http-learning-checker-traffic-session";

export function newTrafficId(): string {
  return `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function loadTrafficSession(): TrafficEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]");
  } catch {
    return [];
  }
}

export function pushTrafficEntry(entry: TrafficEntry): TrafficEntry[] {
  const next = [entry, ...loadTrafficSession()].slice(0, 100);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
}

export function clearTrafficSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function filterTraffic(
  entries: TrafficEntry[],
  query: string
): TrafficEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.url.toLowerCase().includes(q) ||
      e.method.toLowerCase().includes(q) ||
      String(e.status ?? "").includes(q)
  );
}
