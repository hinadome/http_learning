"use client";

import { DocLinks } from "./DocLinks";
import {
  CACHE_LAB_DOCS,
  FRESHNESS_PRECEDENCE_STEPS,
  VALIDATOR_PRECEDENCE_STEPS,
} from "@/lib/learn/cache-control";

const DIRECTIVES = [
  {
    name: "max-age=N",
    summary:
      "Fresh for N seconds (then subtract Age). Overrides Expires when both are set.",
  },
  {
    name: "s-maxage=N",
    summary: "max-age for shared caches (CDN) only; overrides max-age there.",
  },
  {
    name: "no-cache",
    summary:
      "May store, but must revalidate with the origin before reuse (often via ETag).",
  },
  {
    name: "no-store",
    summary: "Do not store in any cache.",
  },
  {
    name: "private / public",
    summary:
      "private = browser only; public = shared caches may store even with auth.",
  },
  {
    name: "must-revalidate",
    summary: "Once stale, must check with the origin — no serving stale.",
  },
  {
    name: "immutable",
    summary:
      "While fresh, representation won’t change (fingerprinted static assets).",
  },
];

const TIME_HEADERS = [
  {
    name: "Date",
    summary:
      "When the origin generated the message. Anchor for Expires and for Age.",
  },
  {
    name: "Expires",
    summary:
      "Absolute HTTP-date when the response becomes stale. Used only if no max-age/s-maxage. Lifetime ≈ Expires − Date.",
  },
  {
    name: "Age",
    summary:
      "Seconds the response has already aged in a cache. remaining freshness ≈ lifetime − Age. Not a lifetime by itself.",
  },
  {
    name: "Last-Modified",
    summary:
      "Validator (and heuristic freshness fallback). Prefer ETag when both exist.",
  },
];

/** HSTS, cache validators, and conditional requests — teaching sketch. */
export function CacheConditionalLesson() {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 text-sm font-semibold">
        Cache, validators &amp; HSTS
      </h3>
      <p className="mb-3 text-xs text-[var(--muted)]">
        HTTP caching has two layers: <strong>freshness</strong> (may I reuse
        without asking?) and <strong>validation</strong> (ask the server if my
        copy is still current). Labs:{" "}
        <strong>Cache-Control</strong>, <strong>Conditional GET (304)</strong>,{" "}
        <strong>HSTS</strong>, <strong>Range (206)</strong>.
      </p>

      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Common Cache-Control directives
      </h4>
      <ul className="mb-4 flex flex-col gap-1.5 text-xs">
        {DIRECTIVES.map((d) => (
          <li
            key={d.name}
            className="rounded border border-[var(--border)] px-2 py-1.5"
          >
            <code className="font-mono text-[var(--accent)]">{d.name}</code>
            <div className="text-[var(--muted)]">{d.summary}</div>
          </li>
        ))}
      </ul>

      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Age, Expires, Date
      </h4>
      <ul className="mb-4 flex flex-col gap-1.5 text-xs">
        {TIME_HEADERS.map((h) => (
          <li
            key={h.name}
            className="rounded border border-[var(--border)] px-2 py-1.5"
          >
            <code className="font-mono text-[var(--accent)]">{h.name}</code>
            <div className="text-[var(--muted)]">{h.summary}</div>
          </li>
        ))}
      </ul>

      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Freshness precedence
      </h4>
      <ol className="mb-4 list-inside list-decimal text-xs text-[var(--muted)]">
        {FRESHNESS_PRECEDENCE_STEPS.map((step) => (
          <li key={step.title} className="mb-1.5 leading-relaxed">
            <strong className="text-[var(--fg)]">{step.title}</strong> —{" "}
            {step.detail}
          </li>
        ))}
      </ol>

      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Conditional validators
      </h4>
      <ol className="mb-2 list-inside list-decimal text-xs text-[var(--muted)]">
        <li>
          First GET → <code className="font-mono">200</code> +{" "}
          <code className="font-mono">ETag</code> and/or{" "}
          <code className="font-mono">Last-Modified</code>.
        </li>
        <li>Cache stores the body and those validators.</li>
        <li>
          Later GET sends{" "}
          <code className="font-mono">If-None-Match</code> (ETag) and/or{" "}
          <code className="font-mono">If-Modified-Since</code>.
        </li>
        <li>
          <strong className="text-[var(--fg)]">Unchanged</strong> →{" "}
          <code className="font-mono">304 Not Modified</code> (keep cached body).
        </li>
        <li>
          <strong className="text-[var(--fg)]">Changed</strong> →{" "}
          <code className="font-mono">200</code> + new body + new validators.
        </li>
      </ol>
      <ul className="mb-3 list-inside list-disc text-xs text-[var(--muted)]">
        {VALIDATOR_PRECEDENCE_STEPS.map((v) => (
          <li key={v.title}>
            <strong className="text-[var(--fg)]">{v.title}</strong> — {v.detail}
          </li>
        ))}
      </ul>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Labs: <strong>Conditional GET (304)</strong> uses{" "}
        <code className="font-mono">If-None-Match</code> on httpbin{" "}
        <code className="font-mono">/etag</code> (that endpoint ignores{" "}
        <code className="font-mono">If-Modified-Since</code>).{" "}
        <strong>If-Modified-Since (304)</strong> uses{" "}
        <code className="font-mono">/cache</code> for the date-based validator.
      </p>

      <dl className="mb-3 flex flex-col gap-2 text-xs">
        <div>
          <dt className="font-medium">Strict-Transport-Security (HSTS)</dt>
          <dd className="text-[var(--muted)]">
            Browsers remember to use HTTPS only for this host. Lab:{" "}
            <strong>Lab: HSTS header</strong>.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Range / 206 Partial Content</dt>
          <dd className="text-[var(--muted)]">
            <code className="font-mono">Range: bytes=…</code> → often{" "}
            <code className="font-mono">206</code> +{" "}
            <code className="font-mono">Content-Range</code>. Lab:{" "}
            <strong>Lab: Range (206)</strong>.
          </dd>
        </div>
      </dl>
      <DocLinks docs={CACHE_LAB_DOCS} />
    </aside>
  );
}
