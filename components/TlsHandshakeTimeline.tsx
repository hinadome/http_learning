"use client";

import type { TlsInfo } from "@/lib/types";
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
] as const;

interface Props {
  /** When present after HTTPS Send, highlight matching timeline steps. */
  tls?: TlsInfo | null;
  /** Request HTTP version — marks QUIC note for v3. */
  httpVersion?: string;
}

function stepState(
  id: string,
  tls?: TlsInfo | null,
  httpVersion?: string
): "done" | "active" | "idle" {
  if (!tls && httpVersion !== "3") return "idle";
  if (id === "quic") {
    if (httpVersion === "3" || tls?.alpnProtocol === "h3") return "active";
    return "idle";
  }
  if (!tls) return "idle";
  if (id === "tcp" || id === "ch" || id === "sh" || id === "keys") return "done";
  if (id === "alpn") return tls.alpnProtocol ? "active" : "done";
  return "idle";
}

export function TlsHandshakeTimeline({ tls, httpVersion }: Props) {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 text-sm font-semibold">TLS handshake timeline</h3>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Educational sketch of a typical HTTPS setup before HTTP/1.1 or HTTP/2
        bytes flow. After Send, steps light up from the live TLS / ALPN panel.
      </p>
      {tls && (
        <p className="mb-3 rounded border border-[var(--ok)]/40 bg-[var(--accent-soft)] px-2 py-1 text-xs">
          Live socket: TLS {tls.protocol ?? "?"}
          {tls.alpnProtocol ? ` · ALPN ${tls.alpnProtocol}` : ""}
          {tls.cipher ? ` · ${tls.cipher.name}` : ""}
        </p>
      )}
      <ol className="flex flex-col gap-0">
        {STEPS.map((s, i) => {
          const state = stepState(s.id, tls, httpVersion);
          return (
            <li key={s.id} className="flex gap-3">
              <div className="flex w-6 flex-col items-center">
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${
                    state === "active"
                      ? "bg-[var(--ok)] ring-2 ring-[var(--ok)]/40"
                      : state === "done"
                        ? "bg-[var(--accent)]"
                        : "bg-[var(--border)]"
                  }`}
                />
                {i < STEPS.length - 1 && (
                  <span className="w-px flex-1 bg-[var(--border)]" />
                )}
              </div>
              <div className="pb-3">
                <div
                  className={`text-sm font-medium ${
                    state === "active" ? "text-[var(--ok)]" : ""
                  }`}
                >
                  {s.label}
                  {state === "active" && tls?.alpnProtocol && s.id === "alpn"
                    ? ` → ${tls.alpnProtocol}`
                    : ""}
                  {state === "done" && (
                    <span className="ml-1 text-[10px] font-normal text-[var(--muted)]">
                      observed
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--muted)]">{s.detail}</div>
              </div>
            </li>
          );
        })}
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
