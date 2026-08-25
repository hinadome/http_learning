"use client";

import type { CompareEncodeResult, LearningLog } from "@/lib/types";
import { statusClass, HEADER_TIPS } from "@/lib/learn/glossary";
import { docsForHeader, statusDocs } from "@/lib/learn/docs";
import { LifecycleTimeline } from "./LifecycleTimeline";
import { BinaryFrameView } from "./BinaryFrameView";
import { DocLinks } from "./DocLinks";

interface Props {
  log: LearningLog | null;
  compare: CompareEncodeResult | null;
  tab: "lifecycle" | "wire" | "response";
  onTab: (t: "lifecycle" | "wire" | "response") => void;
}

export function LearningLogView({ log, compare, tab, onTab }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {(
          [
            ["lifecycle", "Lifecycle"],
            ["wire", "Wire / Binary"],
            ["response", "Response"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={`rounded px-3 py-1.5 text-sm ${
              tab === id
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--panel)] text-[var(--fg)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "lifecycle" && (
        <div>
          {log?.error && (
            <div className="mb-3 rounded border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm">
              {log.error}
            </div>
          )}
          <LifecycleTimeline steps={log?.steps ?? []} />
          {log && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Total {log.timing.totalMs} ms
              {log.timing.ttfbMs != null ? ` · TTFB ${log.timing.ttfbMs} ms` : ""}
            </p>
          )}
        </div>
      )}

      {tab === "wire" && (
        <BinaryFrameView
          encode={log?.encode ?? null}
          sent={log?.sent ?? null}
          compare={compare}
        />
      )}

      {tab === "response" && (
        <ResponseView log={log} />
      )}
    </section>
  );
}

function ResponseView({ log }: { log: LearningLog | null }) {
  const res = log?.response;
  if (!res) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Send a request to inspect the response status, headers, and body.
      </p>
    );
  }

  const sc = statusClass(res.status);
  const statusDoc = statusDocs(res.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded px-2 py-1 font-mono text-sm font-semibold text-white"
          style={{
            background:
              sc.className.startsWith("2")
                ? "var(--ok)"
                : sc.className.startsWith("3")
                  ? "var(--info)"
                  : sc.className.startsWith("4")
                    ? "var(--warn)"
                    : "var(--danger)",
          }}
        >
          {res.status} {res.statusText}
        </span>
        <span className="text-sm text-[var(--muted)]">
          {sc.label} — {sc.summary}
        </span>
        {res.httpVersionNegotiated && (
          <span className="rounded bg-[var(--code)] px-2 py-0.5 font-mono text-xs">
            {res.httpVersionNegotiated}
          </span>
        )}
        {res.streamId != null && (
          <span className="text-xs text-[var(--muted)]">
            stream {res.streamId}
          </span>
        )}
        <span className="text-xs text-[var(--muted)]">
          {res.sizeBytes} bytes
          {res.bodyTruncated ? " (truncated)" : ""}
        </span>
      </div>
      <DocLinks docs={[statusDoc]} className="mt-0" />

      <div>
        <h5 className="mb-2 text-sm font-medium text-[var(--muted)]">
          Response headers
        </h5>
        <ul className="flex flex-col gap-1">
          {Object.entries(res.headers).map(([name, value]) => {
            const tip = HEADER_TIPS[name.toLowerCase()];
            const headerDoc = docsForHeader(name);
            return (
              <li
                key={name}
                className="rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                title={tip}
              >
                <span className="font-mono text-[var(--accent)]">{name}</span>:{" "}
                <span className="font-mono text-xs">
                  {Array.isArray(value) ? value.join(", ") : value}
                </span>
                {tip && (
                  <div className="mt-0.5 text-xs text-[var(--muted)]">{tip}</div>
                )}
                {headerDoc && <DocLinks docs={[headerDoc]} />}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h5 className="mb-2 text-sm font-medium text-[var(--muted)]">Body</h5>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-[var(--code)] p-3 font-mono text-xs">
          {res.body || "(empty)"}
        </pre>
      </div>
    </div>
  );
}
