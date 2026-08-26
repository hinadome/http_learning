"use client";

import { DocLinks } from "./DocLinks";

/** Educational sketch of HTTP/2 stream dependencies / priorities (not live PRIORITY frames). */
export function StreamPrioritySketch() {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 text-sm font-semibold">
        HTTP/2 stream priority sketch
      </h3>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Browsers historically used PRIORITY / PRIORITY_UPDATE so CSS and fonts
        could outrank images. Modern stacks often use <strong>Extensible Priorities</strong>{" "}
        (RFC 9218) instead. This diagram is conceptual — Encode does not emit live
        priority frames.
      </p>
      <div className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--code)] p-3 font-mono text-[10px] leading-relaxed text-[var(--muted)]">
        <pre>{`stream 0 (control)
   └─ :authority / connection
stream 1  HTML document          weight high
   ├─ stream 3  main.css         depends on 1
   ├─ stream 5  app.js           depends on 1
   └─ stream 7  hero.jpg         depends on 1 (lower urgency)
stream 9  font.woff2             high urgency (may be independent)`}</pre>
      </div>
      <ul className="mt-3 list-inside list-disc text-xs text-[var(--muted)]">
        <li>One TCP connection, many streams — scheduler decides who gets bytes.</li>
        <li>Mis-priority can delay LCP even with multiplexing.</li>
        <li>HTTP/3 uses similar urgency ideas over QUIC streams.</li>
      </ul>
      <DocLinks
        className="mt-2"
        docs={[
          {
            label: "RFC 9218 — Extensible Priorities",
            url: "https://www.rfc-editor.org/rfc/rfc9218",
            source: "RFC",
          },
          {
            label: "web.dev: Priority Hints",
            url: "https://web.dev/articles/fetch-priority",
            source: "web.dev",
          },
        ]}
      />
    </aside>
  );
}
