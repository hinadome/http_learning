"use client";

import { DocLinks } from "./DocLinks";

export function ConnectLesson() {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 font-semibold">CONNECT & proxy tunnels</h3>
      <p className="mb-3 text-sm text-[var(--muted)]">
        HTTP <strong>CONNECT</strong> asks a proxy to open a TCP tunnel (often
        for HTTPS). The client then sends TLS inside the tunnel. This app sends
        requests directly from Node — it does not implement CONNECT forwarding.
      </p>
      <ol className="mb-3 list-inside list-decimal space-y-1 text-xs text-[var(--muted)]">
        <li>Client → proxy: <code className="font-mono">CONNECT host:443 HTTP/1.1</code></li>
        <li>Proxy → client: <code className="font-mono">200 Connection Established</code></li>
        <li>Client starts TLS handshake bytes through the tunnel</li>
        <li>Application data (HTTP/2 frames, etc.) flows encrypted</li>
      </ol>
      <p className="text-xs text-[var(--muted)]">
        Corporate proxies and tools like HTTP Toolkit use CONNECT + MITM for
        inspection; see the MITM lesson for why a custom CA is required for HTTPS.
      </p>
      <DocLinks
        docs={[
          {
            label: "RFC 9110 §9.3.6 — CONNECT",
            url: "https://www.rfc-editor.org/rfc/rfc9110#section-9.3.6",
            source: "RFC",
          },
          {
            label: "MDN: CONNECT method",
            url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/CONNECT",
            source: "MDN",
          },
        ]}
      />
    </aside>
  );
}
