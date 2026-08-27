"use client";

import { useEffect, useState } from "react";
import type { JarCookie } from "@/lib/learn/cookie-jar";
import {
  clearCookieJar,
  jarAsCookieHeader,
  loadCookieJar,
  removeJarCookie,
  updateJarCookie,
} from "@/lib/learn/cookie-jar";

interface Props {
  /** Bump after Send / ingest so the panel reloads. */
  revision?: number;
  onExportCookieHeader?: (cookieHeaderLine: string) => void;
  onChange?: () => void;
}

export function CookieJarPanel({
  revision = 0,
  onExportCookieHeader,
  onChange,
}: Props) {
  const [cookies, setCookies] = useState<JarCookie[]>([]);

  function reload() {
    setCookies(loadCookieJar());
  }

  useEffect(() => {
    reload();
  }, [revision]);

  function notify() {
    reload();
    onChange?.();
  }

  function handleClear() {
    clearCookieJar();
    notify();
  }

  function handleExport() {
    const value = jarAsCookieHeader();
    if (!value) return;
    onExportCookieHeader?.(`Cookie: ${value}`);
  }

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Cookie jar</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            className="text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-40"
            disabled={cookies.length === 0}
            onClick={handleExport}
            title="Insert Cookie header into the request editor"
          >
            Export to editor
          </button>
          <button
            type="button"
            className="text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-40"
            disabled={cookies.length === 0}
            onClick={handleClear}
          >
            Clear jar
          </button>
        </div>
      </div>
      <p className="mb-2 text-xs text-[var(--muted)]">
        sessionStorage jar used when <strong>Cookie jar</strong> is enabled.
        Enable the checkbox, Send a Set-Cookie response, then inspect or export
        here.
      </p>
      {cookies.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">Jar is empty.</p>
      ) : (
        <ul className="flex max-h-56 flex-col gap-2 overflow-auto text-xs">
          {cookies.map((c) => (
            <li
              key={`${c.name}|${c.domain}|${c.path}`}
              className="rounded border border-[var(--border)] p-2"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="font-mono font-medium">
                  {c.name}
                  <span className="text-[var(--muted)]">
                    @{c.domain}
                    {c.path}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 text-[var(--muted)] hover:text-[var(--danger)]"
                  onClick={() => {
                    removeJarCookie(c.name, c.domain, c.path);
                    notify();
                  }}
                >
                  Remove
                </button>
              </div>
              <input
                className="mb-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 font-mono"
                value={c.value}
                onChange={(e) => {
                  updateJarCookie(c.name, c.domain, c.path, e.target.value);
                  setCookies(loadCookieJar());
                  onChange?.();
                }}
                aria-label={`Value for ${c.name}`}
              />
              <div className="text-[10px] text-[var(--muted)]">
                {c.secure ? "Secure · " : ""}
                {c.expiresAt
                  ? `Expires ${new Date(c.expiresAt).toLocaleString()}`
                  : "Session"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
