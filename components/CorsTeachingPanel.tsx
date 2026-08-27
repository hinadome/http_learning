"use client";

import { DocLinks } from "./DocLinks";

/** Why browsers enforce CORS but this teaching proxy does not. */
export function CorsTeachingPanel() {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 text-sm font-semibold">CORS teaching</h3>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Cross-Origin Resource Sharing is a <strong>browser</strong> security
        gate for XHR/fetch. This app’s Send path runs in Node, so it is not
        blocked by CORS — that difference is the lesson.
      </p>
      <ol className="mb-3 list-inside list-decimal text-xs text-[var(--muted)]">
        <li>
          In DevTools, fetch a cross-origin URL from the page origin → often
          blocked without <code className="font-mono">Access-Control-Allow-*</code>.
        </li>
        <li>
          Load preset <strong>Lab: CORS headers</strong> → Send here → response
          can show <code className="font-mono">Access-Control-Allow-Origin</code>{" "}
          even though a browser SPA might still be blocked without a matching
          Origin / preflight.
        </li>
        <li>
          Preflight: browsers may send <code className="font-mono">OPTIONS</code>{" "}
          before “non-simple” requests; this proxy does not auto-preflight.
        </li>
      </ol>
      <DocLinks
        docs={[
          {
            label: "MDN: CORS",
            url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS",
            source: "MDN",
          },
          {
            label: "Fetch Living Standard",
            url: "https://fetch.spec.whatwg.org/#cors-protocol",
            source: "Spec",
          },
        ]}
      />
    </aside>
  );
}
