"use client";

import type { CompareEncodeResult, LearningLog } from "@/lib/types";
import { statusClass, HEADER_TIPS } from "@/lib/learn/glossary";
import { docsForHeader, statusDocs } from "@/lib/learn/docs";
import { LifecycleTimeline } from "./LifecycleTimeline";
import { BinaryFrameView } from "./BinaryFrameView";
import { DocLinks } from "./DocLinks";
import { CookieTeachingPanel } from "./CookieTeachingPanel";

interface Props {
  log: LearningLog | null;
  compare: CompareEncodeResult | null;
  tab: "lifecycle" | "wire" | "response";
  onTab: (t: "lifecycle" | "wire" | "response") => void;
  requestUrl?: string;
}

export function LearningLogView({
  log,
  compare,
  tab,
  onTab,
  requestUrl,
}: Props) {
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
          {log?.rewritten && (
            <div className="mb-3 rounded border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-3 py-2 text-sm">
              Response modified by a rewrite rule before display.
            </div>
          )}
          {log?.protocolNotes && log.protocolNotes.length > 0 && (
            <ul className="mb-3 rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]">
              {log.protocolNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
          <LifecycleTimeline steps={log?.steps ?? []} />
          {log && <TimingBreakdown timing={log.timing} />}
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
        <ResponseView log={log} requestUrl={requestUrl} />
      )}
    </section>
  );
}

function TimingBreakdown({
  timing,
}: {
  timing: LearningLog["timing"];
}) {
  const rows = [
    { label: "Total", ms: timing.totalMs },
    { label: "Connect", ms: timing.connectMs },
    { label: "TTFB", ms: timing.ttfbMs },
    { label: "DNS", ms: timing.dnsMs },
  ].filter((r) => r.ms != null && r.ms > 0);

  if (rows.length === 0) return null;

  return (
    <div className="mt-3 rounded border border-[var(--border)] bg-[var(--panel)] p-3">
      <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Timing
      </h5>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-[var(--muted)]">{r.label}</dt>
            <dd className="font-mono font-medium">{r.ms} ms</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ResponseView({
  log,
  requestUrl,
}: {
  log: LearningLog | null;
  requestUrl?: string;
}) {
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
  const isRedirect = res.status >= 300 && res.status < 400;
  const locEntry = Object.entries(res.headers).find(
    ([k]) => k.toLowerCase() === "location"
  );
  const locRaw = locEntry?.[1];
  const locStr = Array.isArray(locRaw) ? locRaw[0] : locRaw;

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
        <span className="text-xs text-[var(--muted)]">
          {res.sizeBytes} bytes
          {res.bodyTruncated ? " (truncated)" : ""}
        </span>
      </div>

      <div className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm">
        <p className="font-medium">Status code teaching</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {res.status} is in the {sc.label} class. {sc.summary}
          {isRedirect &&
            " Clients may follow the Location header on a subsequent request."}
        </p>
        <DocLinks docs={[statusDoc]} className="mt-1" />
      </div>

      {isRedirect && locStr && (
        <div className="rounded border border-[var(--info)]/40 bg-[var(--accent-soft)] px-3 py-2 text-sm">
          <p className="font-medium">Redirect (3xx)</p>
          <p className="mt-1 font-mono text-xs break-all">
            Location: {locStr}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Enable <strong>Follow redirects</strong> on HTTP/1.x to chase this
            hop and see the chain below.
          </p>
          <DocLinks
            docs={[
              {
                label: "MDN: Location",
                url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Location",
                source: "MDN",
              },
            ]}
          />
        </div>
      )}

      {log.redirectChain && log.redirectChain.length > 0 && (
        <div>
          <h5 className="mb-2 text-sm font-medium text-[var(--muted)]">
            Redirect chain
          </h5>
          <ol className="flex flex-col gap-1 text-xs">
            {log.redirectChain.map((h) => (
              <li
                key={h.hop}
                className="rounded border border-[var(--border)] px-2 py-1.5 font-mono"
              >
                {h.hop}. {h.status} {h.statusText} —{" "}
                <span className="text-[var(--muted)]">{h.url}</span>
                {" → "}
                {h.location}
              </li>
            ))}
          </ol>
          {log.finalUrl && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Final URL: <span className="font-mono">{log.finalUrl}</span>
            </p>
          )}
        </div>
      )}

      <CookieTeachingPanel
        headers={res.headers}
        requestUrl={requestUrl ?? log.finalUrl ?? ""}
      />

      {log.assertionResults && log.assertionResults.length > 0 && (
        <div>
          <h5 className="mb-2 text-sm font-medium text-[var(--muted)]">
            Assertions
          </h5>
          <ul className="flex flex-col gap-1 text-xs">
            {log.assertionResults.map((a) => (
              <li
                key={a.id}
                className={`rounded border px-2 py-1 ${
                  a.passed
                    ? "border-[var(--ok)]/50 text-[var(--ok)]"
                    : "border-[var(--danger)]/50 text-[var(--danger)]"
                }`}
              >
                {a.passed ? "✓" : "✗"} {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h5 className="mb-2 text-sm font-medium text-[var(--muted)]">
          Response headers
        </h5>
        <ul className="flex flex-col gap-1">
          {Object.entries(res.headers).map(([name, value]) => {
            const tip = HEADER_TIPS[name.toLowerCase()];
            const headerDoc = docsForHeader(name);
            const isSetCookie = name.toLowerCase() === "set-cookie";
            return (
              <li
                key={name}
                className={`rounded border px-2 py-1.5 text-sm ${
                  isSetCookie
                    ? "border-[var(--warn)]/50 bg-[var(--warn-soft)]"
                    : "border-[var(--border)]"
                }`}
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
