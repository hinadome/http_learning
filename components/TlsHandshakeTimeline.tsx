"use client";

import { DocLinks } from "./DocLinks";

const STEPS = [
  {
    id: "tcp",
    label: "TCP connect",
    detail: "Client opens TCP to server:443 (HTTP/1.1 & HTTP/2).",
  },
  {
    id: "ch",
    label: "ClientHello",
    detail: "Offers TLS versions, cipher suites, and ALPN (h2, http/1.1, …).",
  },
  {
    id: "sh",
    label: "ServerHello + Certificate",
    detail: "Server picks parameters and sends its certificate chain.",
  },
  {
    id: "alpn",
    label: "ALPN negotiated",
    detail: "Application protocol chosen (e.g. h2). Visible in TLS panel after Send.",
  },
  {
    id: "keys",
    label: "Finished / keys",
    detail: "Handshake completes; application data (HTTP) is encrypted.",
  },
  {
    id: "quic",
    label: "HTTP/3 note",
    detail: "HTTP/3 uses QUIC (UDP) — TLS is integrated; no separate TCP+TLS stack.",
  },
];

export function TlsHandshakeTimeline() {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 text-sm font-semibold">TLS handshake timeline</h3>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Educational sketch of a typical HTTPS setup before HTTP/1.1 or HTTP/2
        bytes flow. After Send, compare with the live TLS / ALPN panel.
      </p>
      <ol className="flex flex-col gap-0">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex gap-3">
            <div className="flex w-6 flex-col items-center">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
              {i < STEPS.length - 1 && (
                <span className="w-px flex-1 bg-[var(--border)]" />
              )}
            </div>
            <div className="pb-3">
              <div className="text-sm font-medium">{s.label}</div>
              <div className="text-xs text-[var(--muted)]">{s.detail}</div>
            </div>
          </li>
        ))}
      </ol>
      <DocLinks
        docs={[
          {
            label: "MDN: TLS",
            url: "https://developer.mozilla.org/en-US/docs/Glossary/TLS",
            source: "MDN",
          },
          {
            label: "RFC 7301 — ALPN",
            url: "https://www.rfc-editor.org/rfc/rfc7301",
            source: "RFC",
          },
          {
            label: "RFC 8446 — TLS 1.3",
            url: "https://www.rfc-editor.org/rfc/rfc8446",
            source: "RFC",
          },
        ]}
      />
    </aside>
  );
}
