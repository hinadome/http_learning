import type { ComposedRequest, RewriteRule, SendResponse } from "../types";
import { parseComposedRequest } from "../parse";
import { parseResponseHeaders } from "./mock";

const STORAGE_KEY = "http-learning-checker-rewrites";

export function newRewriteRuleId(): string {
  return `rw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadRewriteRules(): RewriteRule[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveRewriteRules(rules: RewriteRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function matchRewriteRule(
  rules: RewriteRule[],
  req: { method: string; url: string }
): RewriteRule | undefined {
  const parsed = parseComposedRequest({
    version: "1.1",
    method: req.method,
    url: req.url,
    headerText: "",
    body: "",
  });
  const path = parsed.pathWithQuery;
  return rules.find((r) => {
    if (!r.enabled) return false;
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

export function applyRewriteToRequest(
  req: ComposedRequest,
  rules?: RewriteRule[]
): { request: ComposedRequest; rule?: RewriteRule } {
  const rule = rules?.length ? matchRewriteRule(rules, req) : undefined;
  if (!rule?.injectRequestHeaders?.trim()) {
    return { request: req, rule };
  }
  return {
    request: {
      ...req,
      headerText: injectRequestHeaders(req.headerText, rule.injectRequestHeaders),
    },
    rule,
  };
}

export function injectRequestHeaders(
  headerText: string,
  injectLines?: string
): string {
  if (!injectLines?.trim()) return headerText;
  const existing = headerText.trim();
  const extra = injectLines
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return existing ? `${existing}\n${extra.join("\n")}` : extra.join("\n");
}

export function applyResponseRewrite(
  response: SendResponse,
  rule: RewriteRule
): SendResponse {
  let body = response.body;
  let status = response.status;
  const notes: string[] = [];

  if (rule.responseFind && rule.responseReplace !== undefined) {
    body = body.split(rule.responseFind).join(rule.responseReplace);
    notes.push(`Body replace: "${rule.responseFind}" → "${rule.responseReplace}"`);
  }
  if (rule.setResponseStatus != null) {
    status = rule.setResponseStatus;
    notes.push(`Status overridden to ${status}`);
  }

  return {
    ...response,
    status,
    statusText: status === response.status ? response.statusText : "Rewritten",
    body,
    sizeBytes: new TextEncoder().encode(body).length,
  };
}

export { parseResponseHeaders };
