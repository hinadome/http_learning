import type { ComposedRequest, HistoryItem } from "../types";

const KEY = "http-learning-checker-history";
const MAX = 30;

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [];
  }
}

export function pushHistory(request: ComposedRequest, summary: string): HistoryItem[] {
  const item: HistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: Date.now(),
    request,
    summary,
  };
  const next = [item, ...loadHistory().filter((h) => h.summary !== summary)].slice(
    0,
    MAX
  );
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): HistoryItem[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
  }
  return [];
}
