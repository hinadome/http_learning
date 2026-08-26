"use client";

import {
  analyzeSetCookie,
  parseSetCookieHeader,
} from "@/lib/learn/cookies";
import { DocLinks } from "./DocLinks";

interface Props {
  headers: Record<string, string | string[]>;
  requestUrl: string;
  /** Set-Cookie from redirect hop(s) when final response omits them. */
  redirectSetCookies?: Array<string | string[] | undefined>;
}

export function CookieTeachingPanel({
  headers,
  requestUrl,
  redirectSetCookies,
}: Props) {
  let setCookieRaw = Object.entries(headers).find(
    ([k]) => k.toLowerCase() === "set-cookie"
  )?.[1];

  if (!setCookieRaw && redirectSetCookies?.length) {
    const flat = redirectSetCookies.flatMap((v) =>
      v === undefined ? [] : Array.isArray(v) ? v : [v]
    );
    if (flat.length) setCookieRaw = flat;
  }

  if (!setCookieRaw) return null;

  const cookies = parseSetCookieHeader(setCookieRaw);
  if (cookies.length === 0) return null;

  let requestIsHttps = true;
  try {
    requestIsHttps = new URL(requestUrl).protocol === "https:";
  } catch {
    /* ignore */
  }

  return (
    <div className="rounded border border-[var(--warn)]/50 bg-[var(--warn-soft)] p-3">
      <h5 className="mb-2 text-sm font-semibold">Set-Cookie teaching</h5>
      <p className="mb-3 text-xs text-[var(--muted)]">
        The server asked the client to store cookie(s). Browsers send them back
        on later requests via the <code>Cookie</code> header when path, domain,
        Secure, and SameSite rules match.
      </p>
      <DocLinks
        docs={[
          {
            label: "MDN: Set-Cookie",
            url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie",
            source: "MDN",
          },
          {
            label: "MDN: Using HTTP cookies",
            url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies",
            source: "MDN",
          },
        ]}
      />
      <ul className="mt-3 flex flex-col gap-3">
        {cookies.map((c) => {
          const analysis = analyzeSetCookie(c, { requestIsHttps });
          return (
            <li
              key={c.name}
              className="rounded border border-[var(--border)] bg-[var(--panel)] p-2 text-sm"
            >
              <p className="font-mono text-xs">
                <span className="text-[var(--accent)]">{c.name}</span>
                ={c.value}
              </p>
              <ul className="mt-1 flex flex-wrap gap-1">
                {Object.entries(c.attributes).map(([k, v]) => (
                  <li
                    key={k}
                    className="rounded bg-[var(--code)] px-1.5 py-0.5 font-mono text-[10px]"
                  >
                    {k}
                    {v !== true ? `=${v}` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {analysis.summary}
              </p>
              {analysis.findings.length > 0 && (
                <ul className="mt-1 flex flex-col gap-0.5 text-xs">
                  {analysis.findings.map((f, i) => (
                    <li
                      key={i}
                      className={
                        f.severity === "error"
                          ? "text-[var(--danger)]"
                          : f.severity === "warning"
                            ? "text-[var(--warn)]"
                            : "text-[var(--muted)]"
                      }
                    >
                      {f.message}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
