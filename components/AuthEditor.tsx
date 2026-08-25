"use client";

import { useEffect, useState } from "react";
import {
  applyApiKeyToUrl,
  applyAuthToHeaders,
  parseAuthFromHeaders,
  stripApiKeyFromUrl,
  type AuthState,
} from "@/lib/import/auth";
import type { ComposedRequest } from "@/lib/types";

interface Props {
  value: ComposedRequest;
  onChange: (next: ComposedRequest) => void;
}

export function AuthEditor({ value, onChange }: Props) {
  const [auth, setAuth] = useState<AuthState>(() =>
    parseAuthFromHeaders(value.headerText)
  );

  useEffect(() => {
    setAuth(parseAuthFromHeaders(value.headerText));
  }, [value.headerText]);

  function apply(next: AuthState) {
    setAuth(next);
    let url = value.url;
    if (next.type === "api-key" && next.apiKeyIn === "query") {
      url = stripApiKeyFromUrl(url, auth);
      url = applyApiKeyToUrl(url, next);
    } else {
      url = stripApiKeyFromUrl(url, auth);
    }
    const headerText = applyAuthToHeaders(value.headerText, next);
    onChange({ ...value, url, headerText });
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--muted)]">Type</span>
        <select
          className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5"
          value={auth.type}
          onChange={(e) =>
            apply({ ...auth, type: e.target.value as AuthState["type"] })
          }
        >
          <option value="none">None</option>
          <option value="basic">Basic</option>
          <option value="bearer">Bearer token</option>
          <option value="api-key">API key</option>
        </select>
      </label>

      {auth.type === "basic" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--muted)]">Username</span>
            <input
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-mono text-xs"
              value={auth.username}
              onChange={(e) => apply({ ...auth, username: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--muted)]">Password</span>
            <input
              type="password"
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-mono text-xs"
              value={auth.password}
              onChange={(e) => apply({ ...auth, password: e.target.value })}
            />
          </label>
        </div>
      )}

      {auth.type === "bearer" && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--muted)]">Token</span>
          <input
            type="password"
            className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-mono text-xs"
            value={auth.bearerToken}
            onChange={(e) => apply({ ...auth, bearerToken: e.target.value })}
            placeholder="eyJhbG…"
          />
        </label>
      )}

      {auth.type === "api-key" && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--muted)]">Key name</span>
            <input
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-mono text-xs"
              value={auth.apiKeyName}
              onChange={(e) => apply({ ...auth, apiKeyName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--muted)]">Key value</span>
            <input
              type="password"
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-mono text-xs"
              value={auth.apiKeyValue}
              onChange={(e) => apply({ ...auth, apiKeyValue: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--muted)]">Send in</span>
            <select
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5"
              value={auth.apiKeyIn}
              onChange={(e) =>
                apply({
                  ...auth,
                  apiKeyIn: e.target.value as "header" | "query",
                })
              }
            >
              <option value="header">Header</option>
              <option value="query">Query string</option>
            </select>
          </label>
        </>
      )}

      <p className="text-xs text-[var(--muted)]">
        Auth is merged into headers (or URL query for API keys). Treat tokens as
        secrets — they stay in your browser until Send.
      </p>
    </div>
  );
}
