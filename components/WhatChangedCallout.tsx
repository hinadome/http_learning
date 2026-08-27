"use client";

import type { LearningLog } from "@/lib/types";
import { computeWhatChanged } from "@/lib/learn/what-changed";

interface Props {
  log: LearningLog;
  composedHeaderText: string;
  useCookieJar?: boolean;
}

export function WhatChangedCallout({
  log,
  composedHeaderText,
  useCookieJar,
}: Props) {
  const items = computeWhatChanged({
    composedHeaderText,
    log,
    useCookieJar,
  });

  if (!items.length) return null;

  return (
    <aside className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)]/50 p-3">
      <h4 className="mb-1 text-sm font-semibold">What changed on Send</h4>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Educational mutations vs the editor (jar, Host, rewrites, redirects,
        last-wins duplicates). See Wire tab for full header diff.
      </p>
      <ul className="flex flex-col gap-1.5 text-xs">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5"
          >
            <span className="font-medium">{item.label}</span>
            <div className="break-all font-mono text-[10px] text-[var(--muted)]">
              {item.detail}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
