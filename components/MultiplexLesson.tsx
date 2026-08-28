"use client";

import { DocLinks } from "./DocLinks";

export function MultiplexLesson() {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 font-semibold">Multiplexing lesson (H1 vs H2 vs H3)</h3>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Inspired by the interactive{" "}
        <a
          href="https://network-priority.github.io/h2-h3-multiplex-lab/"
          className="text-[var(--accent)] underline"
          target="_blank"
          rel="noreferrer"
        >
          h2-h3-multiplex-lab
        </a>{" "}
        (GitHub Pages demo; source on{" "}
        <a
          href="https://github.com/network-priority/h2-h3-multiplex-lab"
          className="text-[var(--accent)] underline"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        ) — why newer HTTP versions exist.
      </p>
      <div className="grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded border border-[var(--border)] p-3">
          <h4 className="font-medium">HTTP/1.1</h4>
          <ul className="mt-1 list-inside list-disc text-xs text-[var(--muted)]">
            <li>~6 parallel TCP connections per origin</li>
            <li>One request at a time per connection (pipelining rarely used)</li>
            <li>Head-of-line blocking at connection level</li>
          </ul>
        </div>
        <div className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3">
          <h4 className="font-medium">HTTP/2</h4>
          <ul className="mt-1 list-inside list-disc text-xs text-[var(--muted)]">
            <li>Many streams over one TCP + TLS connection</li>
            <li>HPACK header compression</li>
            <li>TCP loss can stall all streams (transport HOL blocking)</li>
          </ul>
        </div>
        <div className="rounded border border-[var(--border)] p-3">
          <h4 className="font-medium">HTTP/3</h4>
          <ul className="mt-1 list-inside list-disc text-xs text-[var(--muted)]">
            <li>QUIC/UDP — often 1-RTT setup (0-RTT with resumption)</li>
            <li>Independent streams — loss affects one stream, not all</li>
            <li>QPACK instead of HPACK</li>
          </ul>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Use the <strong>Multiplex load simulator</strong> with{" "}
        <strong>Simulate packet loss</strong> on — under ideal networks H2 and H3
        look alike; under loss, H2 freezes every stream while H3 keeps the others
        moving. Also try <strong>Compare 2 vs 3</strong> for wire/frame differences.
      </p>
      <DocLinks
        docs={[
          {
            label: "RFC 9113 — HTTP/2 streams",
            url: "https://www.rfc-editor.org/rfc/rfc9113#name-streams",
            source: "RFC",
          },
          {
            label: "RFC 9000 — QUIC streams",
            url: "https://www.rfc-editor.org/rfc/rfc9000#name-streams",
            source: "RFC",
          },
        ]}
      />
    </aside>
  );
}
