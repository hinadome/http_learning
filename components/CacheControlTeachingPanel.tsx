"use client";

import { useState } from "react";
import type { SendResponse } from "@/lib/types";
import {
  analyzeCacheDecision,
  analyzeFreshnessPrecedence,
  CACHE_LAB_DOCS,
  explainAge,
  explainCacheControl,
  explainConditionalOutcome,
  explainEtag,
  explainExpires,
  FRESHNESS_PRECEDENCE_STEPS,
  VALIDATOR_PRECEDENCE_STEPS,
  type CacheRole,
} from "@/lib/learn/cache-control";
import { DocLinks } from "./DocLinks";

interface Props {
  headers: SendResponse["headers"];
  status: number;
  /** Raw request header text (to detect If-None-Match). */
  requestHeaderText?: string;
}

function getHeader(
  headers: SendResponse["headers"],
  name: string
): string | undefined {
  const entry = Object.entries(headers).find(
    ([k]) => k.toLowerCase() === name.toLowerCase()
  );
  if (!entry) return undefined;
  return Array.isArray(entry[1]) ? entry[1].join(", ") : String(entry[1]);
}

function requestHeaderValue(
  headerText: string | undefined,
  name: string
): string | undefined {
  if (!headerText) return undefined;
  for (const line of headerText.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    if (line.slice(0, i).trim().toLowerCase() === name.toLowerCase()) {
      return line.slice(i + 1).trim();
    }
  }
  return undefined;
}

/** Deep teaching when Cache-Control / ETag / Age / Expires / 304 appear. */
export function CacheControlTeachingPanel({
  headers,
  status,
  requestHeaderText,
}: Props) {
  const [role, setRole] = useState<CacheRole>("shared");

  const cacheControl = getHeader(headers, "Cache-Control");
  const etag = getHeader(headers, "ETag");
  const age = getHeader(headers, "Age");
  const expires = getHeader(headers, "Expires");
  const date = getHeader(headers, "Date");
  const lastModified = getHeader(headers, "Last-Modified");
  const ifNoneMatch = requestHeaderValue(requestHeaderText, "If-None-Match");
  const ifModifiedSince = requestHeaderValue(
    requestHeaderText,
    "If-Modified-Since"
  );

  const relevant =
    cacheControl ||
    etag ||
    age ||
    expires ||
    date ||
    lastModified ||
    status === 304 ||
    ifNoneMatch ||
    ifModifiedSince;

  if (!relevant) return null;

  const sharedCache = role === "shared";
  const directives = cacheControl ? explainCacheControl(cacheControl) : [];
  const freshness = analyzeFreshnessPrecedence({
    cacheControl,
    expires,
    date,
    age,
    lastModified,
    sharedCache,
  });
  const decision = analyzeCacheDecision({
    cacheControl,
    expires,
    date,
    age,
    lastModified,
    role,
  });
  const outcome = explainConditionalOutcome({
    status,
    requestIfNoneMatch: ifNoneMatch,
    requestIfModifiedSince: ifModifiedSince,
    responseEtag: etag,
    responseLastModified: lastModified,
  });

  return (
    <div className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)]/40 px-3 py-3">
      <h5 className="mb-1 text-sm font-semibold">Cache &amp; validators</h5>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Freshness (may I reuse without asking?) vs validation (is my copy still
        current?). Lifetime signals compete — see precedence below. Age reduces
        remaining freshness; it does not set it.
      </p>

      <div className="mb-3 rounded border border-[var(--accent)] bg-[var(--panel)] px-2 py-2 text-xs">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h6 className="font-semibold">Cache decision (teaching)</h6>
          <div
            className="flex rounded border border-[var(--border)] text-[10px]"
            role="group"
            aria-label="Cache role"
          >
            {(
              [
                ["browser", "Browser"],
                ["shared", "Shared (CDN)"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`px-2 py-1 ${
                  role === id
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
                onClick={() => setRole(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-2 text-[10px] text-[var(--muted)]">
          {decision.disclaimer}
        </p>
        <p className="mb-2 rounded border border-[var(--border)] bg-[var(--code)] px-2 py-1.5 font-medium text-[var(--fg)]">
          → {decision.outcomeLabel}
        </p>
        <ol className="flex flex-col gap-1.5">
          {decision.steps.map((step) => (
            <li
              key={step.id}
              className={`rounded border px-2 py-1.5 ${
                step.active
                  ? "border-[var(--accent)]/60 bg-[var(--accent-soft)]"
                  : "border-[var(--border)]"
              }`}
            >
              <div className="font-medium text-[var(--fg)]">{step.title}</div>
              <div className="text-[var(--muted)]">{step.detail}</div>
            </li>
          ))}
        </ol>
        <div className="mt-2 rounded border border-[var(--border)] px-2 py-1.5 text-[10px] text-[var(--muted)]">
          <p className="font-medium text-[var(--fg)]">Age (simplified)</p>
          <p className="mt-0.5">{decision.ageSimpleNote}</p>
          <details className="mt-1">
            <summary className="cursor-pointer font-medium text-[var(--fg)]">
              RFC 9111 age formula (full sketch)
            </summary>
            <p className="mt-1">{decision.ageRfcNote}</p>
          </details>
        </div>
      </div>

      {cacheControl && (
        <div className="mb-3">
          <h6 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Cache-Control directives
          </h6>
          <p className="mb-2 break-all font-mono text-[10px] text-[var(--fg)]">
            {cacheControl}
          </p>
          <ul className="flex flex-col gap-1.5 text-xs">
            {directives.map((d) => (
              <li
                key={`${d.name}=${d.value ?? ""}`}
                className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5"
              >
                <span className="font-mono text-[var(--accent)]">
                  {d.name}
                  {d.value != null ? `=${d.value}` : ""}
                </span>
                <div className="text-[var(--muted)]">{d.summary}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3">
        <h6 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Freshness headers on this response
        </h6>
        <dl className="flex flex-col gap-2 text-xs">
          {age && (
            <div className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
              <dt className="font-mono font-medium text-[var(--accent)]">Age</dt>
              <dd className="text-[var(--muted)]">{explainAge(age)}</dd>
            </div>
          )}
          {expires && (
            <div className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
              <dt className="font-mono font-medium text-[var(--accent)]">
                Expires
              </dt>
              <dd className="text-[var(--muted)]">
                {explainExpires(expires, date)}
              </dd>
            </div>
          )}
          {date && (
            <div className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
              <dt className="font-mono font-medium text-[var(--accent)]">Date</dt>
              <dd className="text-[var(--muted)]">
                Origin generation time ({date}). Anchor for Expires and for
                interpreting Age.
              </dd>
            </div>
          )}
          {!age && !expires && !date && (
            <p className="text-[var(--muted)]">
              No Age / Expires / Date called out — freshness may still come from
              Cache-Control max-age alone.
            </p>
          )}
        </dl>
      </div>

      <div className="mb-3 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-2 text-xs">
        <h6 className="mb-1 font-semibold">
          Precedence on this response ({role === "shared" ? "shared" : "browser"}{" "}
          view)
        </h6>
        <p className="mb-2 text-[var(--muted)]">{freshness.summary}</p>
        {freshness.remainingHint && (
          <p className="mb-2 font-mono text-[10px] text-[var(--fg)]">
            {freshness.remainingHint}
          </p>
        )}
        {freshness.signals.length > 0 ? (
          <ol className="flex flex-col gap-1.5">
            {freshness.signals.map((s) => (
              <li
                key={s.id}
                className={`rounded border px-2 py-1.5 ${
                  s.wins
                    ? "border-[var(--ok)]/50 bg-[var(--accent-soft)]"
                    : "border-[var(--border)]"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[var(--accent)]">
                    {s.header}
                    {s.value ? `: ${s.value}` : ""}
                  </span>
                  <span className="text-[10px] uppercase text-[var(--muted)]">
                    {s.role}
                    {s.wins ? " · wins" : ""}
                  </span>
                </div>
                <div className="text-[var(--muted)]">{s.note}</div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[var(--muted)]">
            No freshness headers detected on this response.
          </p>
        )}
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] font-medium text-[var(--fg)]">
            Full freshness precedence (RFC 9111 sketch)
          </summary>
          <ol className="mt-1 list-inside list-decimal text-[10px] text-[var(--muted)]">
            {FRESHNESS_PRECEDENCE_STEPS.map((step) => (
              <li key={step.title} className="mb-1">
                <strong className="text-[var(--fg)]">{step.title}</strong> —{" "}
                {step.detail}
              </li>
            ))}
          </ol>
        </details>
      </div>

      {(etag || lastModified) && (
        <dl className="mb-3 flex flex-col gap-2 text-xs">
          {etag && (
            <div>
              <dt className="font-medium">ETag</dt>
              <dd className="text-[var(--muted)]">{explainEtag(etag)}</dd>
            </div>
          )}
          {lastModified && (
            <div>
              <dt className="font-medium">Last-Modified</dt>
              <dd className="text-[var(--muted)]">
                Timestamp validator ({lastModified}). Pair with{" "}
                <code className="font-mono">If-Modified-Since</code>. When both
                ETag and Last-Modified exist, prefer ETag / If-None-Match.
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="mb-3 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-2 text-xs">
        <p className="font-medium">{outcome.title}</p>
        <p className="mt-1 text-[var(--muted)]">{outcome.detail}</p>
        {(ifNoneMatch || ifModifiedSince) && (
          <ul className="mt-2 list-inside list-disc text-[10px] text-[var(--muted)]">
            {ifNoneMatch && (
              <li>
                Request had{" "}
                <code className="font-mono">If-None-Match: {ifNoneMatch}</code>
              </li>
            )}
            {ifModifiedSince && (
              <li>
                Request had{" "}
                <code className="font-mono">
                  If-Modified-Since: {ifModifiedSince}
                </code>
              </li>
            )}
          </ul>
        )}
        <p className="mt-2 text-[10px] font-medium text-[var(--fg)]">
          Validator precedence
        </p>
        <ul className="mt-1 list-inside list-disc text-[10px] text-[var(--muted)]">
          {VALIDATOR_PRECEDENCE_STEPS.map((v) => (
            <li key={v.title}>
              <strong className="text-[var(--fg)]">{v.title}</strong> — {v.detail}
            </li>
          ))}
        </ul>
      </div>

      <DocLinks docs={CACHE_LAB_DOCS} />
    </div>
  );
}
