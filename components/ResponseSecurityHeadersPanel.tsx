"use client";

import type { SendResponse } from "@/lib/types";
import { DocLinks } from "./DocLinks";

interface Props {
  headers: SendResponse["headers"];
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

const WATCH = [
  {
    name: "Strict-Transport-Security",
    tip: "HSTS — browsers will prefer HTTPS for this host after seeing this.",
  },
  {
    name: "Cache-Control",
    tip: "Freshness directives (max-age, no-store, …). Overrides Expires when max-age/s-maxage is set.",
  },
  {
    name: "Expires",
    tip: "Absolute expiry time. Used only if no max-age/s-maxage. Pair with Date.",
  },
  {
    name: "Date",
    tip: "Origin generation time — anchor for Expires and Age.",
  },
  {
    name: "ETag",
    tip: "Validator for conditional requests (pair with If-None-Match; preferred over Last-Modified).",
  },
  {
    name: "Age",
    tip: "Seconds already in a cache. Remaining freshness ≈ lifetime − Age (not a lifetime itself).",
  },
  {
    name: "Last-Modified",
    tip: "Timestamp validator / heuristic freshness fallback. Prefer ETag when both exist.",
  },
  {
    name: "Content-Range",
    tip: "Byte range returned with 206 Partial Content.",
  },
  {
    name: "Accept-Ranges",
    tip: "Server advertises range support (usually bytes).",
  },
  {
    name: "Access-Control-Allow-Origin",
    tip: "CORS: origins allowed to read this response in a browser.",
  },
  {
    name: "Access-Control-Allow-Methods",
    tip: "CORS: methods allowed after a successful preflight.",
  },
] as const;

/** Highlight cache / HSTS / CORS / Range headers when present on the response. */
export function ResponseSecurityHeadersPanel({ headers }: Props) {
  const found = WATCH.map((w) => ({
    ...w,
    value: getHeader(headers, w.name),
  })).filter((w) => w.value);

  if (!found.length) return null;

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
      <h5 className="mb-2 text-sm font-semibold">
        Cache / CORS / security headers
      </h5>
      <ul className="flex flex-col gap-2 text-xs">
        {found.map((w) => (
          <li key={w.name}>
            <div className="font-mono text-[var(--accent)]">{w.name}</div>
            <div className="break-all font-mono text-[10px] text-[var(--muted)]">
              {w.value}
            </div>
            <div className="text-[var(--muted)]">{w.tip}</div>
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <DocLinks
          docs={[
            {
              label: "MDN: HTTP headers",
              url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers",
              source: "MDN",
            },
          ]}
        />
      </div>
    </div>
  );
}
