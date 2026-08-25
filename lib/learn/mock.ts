import type { MockRule } from "../types";
import { parseComposedRequest } from "../parse";

const STORAGE_KEY = "http-learning-checker-mocks";

export function newMockRuleId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadMockRules(): MockRule[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveMockRules(rules: MockRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function parseResponseHeaders(headerText: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of headerText.split("\n")) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return map;
}

export function matchMockRule(
  rules: MockRule[],
  ruleId: string | undefined,
  req: { method: string; url: string }
): MockRule | undefined {
  if (ruleId) return rules.find((r) => r.id === ruleId);
  const parsed = parseComposedRequest({
    version: "1.1",
    method: req.method,
    url: req.url,
    headerText: "",
    body: "",
  });
  const path = parsed.pathWithQuery;
  return rules.find((r) => {
    if (r.method && r.method.toUpperCase() !== req.method.toUpperCase()) {
      return false;
    }
    try {
      return new RegExp(r.pathPattern).test(path);
    } catch {
      return path.includes(r.pathPattern);
    }
  });
}

export function executeMockRule(rule: MockRule): {
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
  body: string;
} {
  return {
    status: rule.status,
    statusText: rule.status === 200 ? "OK" : "Mock",
    headers: parseResponseHeaders(rule.responseHeaders),
    body: rule.responseBody,
  };
}
