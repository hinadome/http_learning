"use client";

import { DocLinks } from "./DocLinks";

export function CaptureGuidePanel() {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 font-semibold">Packet capture (Wireshark / qvis)</h3>
      <p className="text-sm text-[var(--muted)]">
        This app shows application-level HTTP. For UDP/QUIC bytes on the wire,
        use external capture tools and correlate with Send timing here.
      </p>
      <ol className="mt-2 list-inside list-decimal text-xs text-[var(--muted)]">
        <li>Send a request and note the timestamp in the Lifecycle tab.</li>
        <li>Export <strong>Copy HAR</strong> for structured request/response data.</li>
        <li>Capture on your machine with Wireshark (filter: tcp.port==443 or udp).</li>
        <li>For HTTP/3, open the capture in{" "}
          <a href="https://qvis.quictools.info/" className="text-[var(--accent)] underline" target="_blank" rel="noreferrer">
            qvis
          </a>{" "}
          to inspect QUIC streams and loss.
        </li>
      </ol>
      <DocLinks
        docs={[
          {
            label: "Wireshark — HTTP/2 analysis",
            url: "https://wiki.wireshark.org/HTTP2",
            source: "Guide",
          },
          {
            label: "qvis — QUIC visualisation",
            url: "https://qvis.quictools.info/",
            source: "Guide",
          },
        ]}
      />
    </aside>
  );
}
