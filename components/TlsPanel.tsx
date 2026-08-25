"use client";

import type { TlsInfo } from "@/lib/types";
import { DocLinks } from "./DocLinks";

interface Props {
  tls: TlsInfo;
}

export function TlsPanel({ tls }: Props) {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 text-sm font-semibold">TLS / ALPN inspection</h3>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Observed on the Node HTTPS socket after Send (educational; not a full
        packet capture).
      </p>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        {tls.protocol && (
          <div>
            <dt className="text-[var(--muted)]">TLS version</dt>
            <dd className="font-mono">{tls.protocol}</dd>
          </div>
        )}
        {tls.alpnProtocol && (
          <div>
            <dt className="text-[var(--muted)]">ALPN negotiated</dt>
            <dd className="font-mono">{tls.alpnProtocol}</dd>
          </div>
        )}
        {tls.cipher && (
          <div>
            <dt className="text-[var(--muted)]">Cipher</dt>
            <dd className="font-mono">
              {tls.cipher.name} ({tls.cipher.version})
            </dd>
          </div>
        )}
        {tls.authorized != null && (
          <div>
            <dt className="text-[var(--muted)]">Certificate trusted</dt>
            <dd>{tls.authorized ? "Yes (system CA)" : "No"}</dd>
          </div>
        )}
        {tls.subject && (
          <div className="sm:col-span-2">
            <dt className="text-[var(--muted)]">Subject</dt>
            <dd className="font-mono break-all">{tls.subject}</dd>
          </div>
        )}
        {tls.issuer && (
          <div className="sm:col-span-2">
            <dt className="text-[var(--muted)]">Issuer</dt>
            <dd className="font-mono break-all">{tls.issuer}</dd>
          </div>
        )}
        {(tls.validFrom || tls.validTo) && (
          <div className="sm:col-span-2">
            <dt className="text-[var(--muted)]">Validity</dt>
            <dd className="font-mono text-xs">
              {tls.validFrom} → {tls.validTo}
            </dd>
          </div>
        )}
      </dl>
      <DocLinks
        className="mt-2"
        docs={[
          {
            label: "RFC 7301 — ALPN",
            url: "https://www.rfc-editor.org/rfc/rfc7301",
            source: "RFC",
          },
          {
            label: "MDN: TLS",
            url: "https://developer.mozilla.org/en-US/docs/Glossary/TLS",
            source: "MDN",
          },
        ]}
      />
    </aside>
  );
}
