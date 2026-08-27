"use client";

import type { RedirectHop } from "@/lib/types";

interface Props {
  hops: RedirectHop[];
  finalUrl?: string;
}

function formatSetCookie(setCookie?: string | string[]): string | null {
  if (!setCookie) return null;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  if (!list.length) return null;
  return list.map((s) => s.slice(0, 80)).join(" · ");
}

/** Visual redirect hop timeline with Set-Cookie / Cookie jar annotations. */
export function RedirectHopTimeline({ hops, finalUrl }: Props) {
  if (!hops.length) return null;

  return (
    <div>
      <h5 className="mb-2 text-sm font-medium text-[var(--muted)]">
        Redirect hop timeline
      </h5>
      <ol className="flex flex-col gap-0">
        {hops.map((h, i) => {
          const sc = formatSetCookie(h.setCookie);
          return (
            <li key={h.hop} className="flex gap-3">
              <div className="flex w-6 flex-col items-center">
                <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                  {h.hop}
                </span>
                {(i < hops.length - 1 || finalUrl) && (
                  <span className="w-px flex-1 bg-[var(--border)]" />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-4">
                <div className="text-sm font-medium">
                  {h.status} {h.statusText}
                </div>
                <div className="break-all font-mono text-xs text-[var(--muted)]">
                  {h.url}
                </div>
                <div className="mt-0.5 break-all font-mono text-xs">
                  → Location: {h.location}
                </div>
                {sc && (
                  <div className="mt-1 rounded border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-2 py-1 text-[10px]">
                    Set-Cookie: {sc}
                    {Array.isArray(h.setCookie) && h.setCookie.length > 1
                      ? ` (+${h.setCookie.length - 1} more)`
                      : ""}
                  </div>
                )}
                {h.cookieSentNext && (
                  <div className="mt-1 rounded border border-[var(--ok)]/40 bg-[var(--accent-soft)] px-2 py-1 text-[10px]">
                    Cookie on next hop: {h.cookieSentNext.slice(0, 120)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
        {finalUrl && (
          <li className="flex gap-3">
            <div className="flex w-6 flex-col items-center">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--ok)]" />
            </div>
            <div className="pb-1">
              <div className="text-sm font-medium">Final URL</div>
              <div className="break-all font-mono text-xs text-[var(--muted)]">
                {finalUrl}
              </div>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
