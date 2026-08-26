import type { DocRef } from "../types";

export interface LabGuide {
  steps: string[];
  why?: string;
  docs?: DocRef[];
}

/** Guided “Try this” steps keyed by preset id. */
export const LAB_GUIDES: Record<string, LabGuide> = {
  "httpbin-get": {
    steps: [
      "Validate — should pass (Host present).",
      "Encode — inspect HTTP/1.1 text wire.",
      "Send — check Response status and Actually sent on Wire tab.",
    ],
    why: "Baseline happy-path request.",
  },
  "missing-host": {
    steps: [
      "Validate — expect Host required error on HTTP/1.1.",
      "Enable Send anyway → Send.",
      "Wire tab — confirm Host was omitted on Actually sent.",
    ],
    why: "HTTP/1.1 requires Host; many servers return 400 without it.",
  },
  "set-cookie-response": {
    steps: [
      "Keep Follow redirects off.",
      "Send → Response shows 302 + Set-Cookie teaching.",
      "Optional: enable Cookie jar + Follow redirects → Send again and inspect Cookie on redirect hop / next request.",
    ],
    why: "Set-Cookie is on the 302; empty cookies JSON after follow means no jar.",
  },
  "redirect-302": {
    steps: [
      "Send with Follow redirects off → see 302 + Location.",
      "Enable Follow redirects → Send → inspect redirect chain.",
    ],
  },
  "websocket-echo": {
    steps: [
      "Protocol is WebSocket; URL is wss://…",
      "Set outbound message (e.g. Hello) → Send.",
      "Response body shows live frames (101 is a UI wrapper).",
    ],
  },
  "chunked-encoding": {
    steps: [
      "Encode (not required to Send) → Wire shows chunked framing.",
      "Note Transfer-Encoding: chunked in headers.",
    ],
    why: "Chunked is HTTP/1.1 body framing without Content-Length.",
  },
  "h2-trailers": {
    steps: ["Version HTTP/2 → Encode → look for trailing HEADERS frame."],
  },
  "h2-push": {
    steps: ["Version HTTP/2 → Encode → look for PUSH_PROMISE (educational)."],
  },
  "cl-te-smuggling": {
    steps: [
      "Encode only — do not Send to random targets.",
      "Inspect notes about Content-Length vs Transfer-Encoding.",
      "Read the linked RFC / MDN on request smuggling risks.",
    ],
    why: "Both CL and TE in one message is ambiguous and dangerous.",
    docs: [
      {
        label: "RFC 9112 — Message body",
        url: "https://www.rfc-editor.org/rfc/rfc9112#name-message-body",
        source: "RFC",
      },
      {
        label: "PortSwigger: HTTP request smuggling",
        url: "https://portswigger.net/web-security/request-smuggling",
        source: "Guide",
      },
    ],
  },
  "duplicate-accept-h2": {
    steps: [
      "Validate — duplicate header warning.",
      "Send → Wire / Actually sent keeps the last Accept value.",
    ],
  },
  "http2-get": {
    steps: [
      "Encode — pseudo-headers + HPACK.",
      "Send (https) — TLS/ALPN panel after connect.",
      "Open Multiplex simulator with packet loss.",
    ],
  },
  "http3-get": {
    steps: [
      "Encode — QPACK / QUIC timeline.",
      "Send if HTTP/3 transport available.",
      "Compare 2 vs 3 for HPACK vs QPACK.",
    ],
  },
};

export function getLabGuide(presetId: string | null | undefined): LabGuide | null {
  if (!presetId) return null;
  return LAB_GUIDES[presetId] ?? null;
}
