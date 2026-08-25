"use client";

import { useState } from "react";
import type { TrafficEntry } from "@/lib/types";
import {
  clearTrafficSession,
  filterTraffic,
} from "@/lib/learn/traffic-log";

interface Props {
  entries: TrafficEntry[];
  onSelect?: (entry: TrafficEntry) => void;
  onClear: () => void;
}

export function TrafficLogPanel({ entries, onSelect, onClear }: Props) {
  const [filter, setFilter] = useState("");
  const shown = filterTraffic(entries, filter);

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Session traffic</h3>
        <button
          type="button"
          className="text-xs text-[var(--muted)] hover:text-[var(--danger)]"
          onClick={() => {
            clearTrafficSession();
            onClear();
          }}
        >
          Clear
        </button>
      </div>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Intercept-style log of requests sent through this app in the current
        browser tab (not system-wide browser traffic).
      </p>
      <input
        className="mb-2 w-full rounded border border-[var(--border)] px-2 py-1 text-xs"
        placeholder="Filter URL, method, status…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {shown.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">No traffic yet — Send a request.</p>
      ) : (
        <ul className="flex max-h-48 flex-col gap-1 overflow-auto text-xs">
          {shown.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="w-full rounded border border-[var(--border)] px-2 py-1 text-left hover:border-[var(--accent)]"
                onClick={() => onSelect?.(e)}
              >
                <span className="font-mono">
                  {e.status ?? "—"} {e.method}
                </span>{" "}
                <span className="text-[var(--muted)]">{e.url.slice(0, 60)}</span>
                {e.mocked && (
                  <span className="ml-1 rounded bg-[var(--code)] px-1">mock</span>
                )}
                {e.rewritten && (
                  <span className="ml-1 rounded bg-[var(--warn-soft)] px-1">
                    rewrite
                  </span>
                )}
                <span className="float-right text-[var(--muted)]">
                  {e.durationMs}ms
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
