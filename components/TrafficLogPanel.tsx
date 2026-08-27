"use client";

import { useEffect, useState } from "react";
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

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function TrafficEntryDetail({
  entry,
  onClose,
}: {
  entry: TrafficEntry;
  onClose: () => void;
}) {
  return (
    <div className="mt-3 rounded border border-[var(--accent-border)] bg-[var(--accent-soft)]/40 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-medium">
            {entry.status ?? "—"} {entry.method}
          </p>
          <p className="mt-0.5 break-all font-mono text-xs text-[var(--muted)]">
            {entry.url}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <dl className="mb-3 grid gap-1 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-[var(--muted)]">Time</dt>
          <dd>{formatTime(entry.at)}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Duration</dt>
          <dd className="font-mono">{entry.durationMs} ms</dd>
        </div>
        {(entry.mocked || entry.rewritten) && (
          <div className="sm:col-span-2">
            <dt className="text-[var(--muted)]">Flags</dt>
            <dd className="flex flex-wrap gap-1">
              {entry.mocked && (
                <span className="rounded bg-[var(--code)] px-1">mock</span>
              )}
              {entry.rewritten && (
                <span className="rounded bg-[var(--warn-soft)] px-1">
                  rewrite
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
      <div className="flex flex-col gap-2">
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Request headers
          </h4>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-[var(--code)] p-2 font-mono text-xs">
            {entry.requestHeaders.trim() || "(none)"}
          </pre>
        </div>
        {entry.responsePreview != null && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Response preview
            </h4>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-[var(--code)] p-2 font-mono text-xs">
              {entry.responsePreview || "(empty)"}
            </pre>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              First ~200 characters captured at Send time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TrafficLogPanel({ entries, onSelect, onClear }: Props) {
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shown = filterTraffic(entries, filter);
  const selected =
    shown.find((e) => e.id === selectedId) ??
    entries.find((e) => e.id === selectedId) ??
    null;

  useEffect(() => {
    if (selectedId && !entries.some((e) => e.id === selectedId)) {
      setSelectedId(null);
    }
  }, [entries, selectedId]);

  function selectEntry(entry: TrafficEntry) {
    setSelectedId((prev) => (prev === entry.id ? null : entry.id));
    onSelect?.(entry);
  }

  function handleClear() {
    clearTrafficSession();
    setSelectedId(null);
    onClear();
  }

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Session traffic</h3>
        <button
          type="button"
          className="text-xs text-[var(--muted)] hover:text-[var(--danger)]"
          onClick={handleClear}
        >
          Clear session traffic
        </button>
      </div>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Intercept-style log of requests sent through this app in the current
        browser tab (not system-wide browser traffic). Click a row for details.
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
                className={`w-full rounded border px-2 py-1 text-left transition-colors ${
                  selectedId === e.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] hover:border-[var(--accent)]"
                }`}
                onClick={() => selectEntry(e)}
                aria-expanded={selectedId === e.id}
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
      {selected && (
        <TrafficEntryDetail
          entry={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </aside>
  );
}
