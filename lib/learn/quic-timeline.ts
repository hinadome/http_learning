import type { LifecycleStep } from "../types";

/** Educational QUIC + TLS 1.3 handshake timeline (not a packet capture). */
export function buildQuicHandshakeTimeline(opts: {
  hostname: string;
  altSvc?: string | null;
  transport?: "currentspace" | "curl" | "educational";
}): LifecycleStep[] {
  const alt = opts.altSvc?.trim();
  return [
    {
      id: "quic-udp",
      label: "UDP path to :443",
      status: "ok",
      detail: `QUIC uses UDP (not TCP) toward ${opts.hostname}:443`,
    },
    {
      id: "quic-init",
      label: "QUIC Initial + TLS ClientHello",
      status: "ok",
      detail:
        "TLS 1.3 is embedded in QUIC crypto frames — there is no separate TCP then TLS layering.",
    },
    {
      id: "quic-handshake",
      label: "QUIC Handshake / 1-RTT keys",
      status: "ok",
      detail:
        "Server Hello + certificates + finished; connection IDs and keys established.",
    },
    {
      id: "h3-settings",
      label: "HTTP/3 control streams + SETTINGS",
      status: "ok",
      detail:
        "Peer opens unidirectional control / QPACK streams, then SETTINGS on the control stream.",
    },
    {
      id: "h3-request",
      label: "Request stream (HEADERS ± DATA)",
      status: "ok",
      detail:
        "Bidirectional stream carries QPACK-compressed headers then optional DATA frames.",
    },
    {
      id: "alt-svc",
      label: "Alt-Svc discovery",
      status: alt ? "ok" : "skip",
      detail: alt
        ? `Observed Alt-Svc: ${alt}`
        : "No Alt-Svc seen on probe (server may still speak h3 on :443).",
    },
    {
      id: "h3-transport",
      label: "Live transport",
      status: opts.transport === "educational" ? "skip" : "ok",
      detail:
        opts.transport === "currentspace"
          ? "Live send via @currentspace/http3 (QUIC)"
          : opts.transport === "curl"
            ? "Live send via curl --http3"
            : "Educational encode only — no live QUIC socket",
    },
  ];
}

export const QUIC_LESSON_NOTES = [
  "HTTP/3 runs over QUIC (UDP). Multiplexing is not blocked by TCP head-of-line loss recovery.",
  "TLS 1.3 is integrated into the QUIC handshake (no classic TCP→TLS upgrade sequence).",
  "QPACK compresses headers on dedicated encoder/decoder streams so one blocked stream does not stall all header compression (unlike HPACK on HTTP/2).",
  "Raw QUIC UDP ciphertext is not shown; the app shows educational HTTP/3 frames + QPACK field encoding.",
];
