export interface GlossaryEntry {
  term: string;
  summary: string;
  docs?: Array<{ label: string; url: string; source?: string }>;
}

export const METHOD_INFO: Record<
  string,
  { safe: boolean; idempotent: boolean; body: boolean; summary: string }
> = {
  GET: {
    safe: true,
    idempotent: true,
    body: false,
    summary: "Retrieve a representation. Should not change server state.",
  },
  HEAD: {
    safe: true,
    idempotent: true,
    body: false,
    summary: "Like GET but response has no body — headers only.",
  },
  POST: {
    safe: false,
    idempotent: false,
    body: true,
    summary: "Submit data for processing; may create resources or trigger actions.",
  },
  PUT: {
    safe: false,
    idempotent: true,
    body: true,
    summary: "Replace the target resource with the request body.",
  },
  PATCH: {
    safe: false,
    idempotent: false,
    body: true,
    summary: "Partial update of the target resource.",
  },
  DELETE: {
    safe: false,
    idempotent: true,
    body: false,
    summary: "Remove the target resource.",
  },
  OPTIONS: {
    safe: true,
    idempotent: true,
    body: false,
    summary: "Ask which methods/headers the server allows (also used for CORS preflight).",
  },
  TRACE: {
    safe: true,
    idempotent: true,
    body: false,
    summary: "Echo the request for diagnostics (often disabled).",
  },
  CONNECT: {
    safe: false,
    idempotent: false,
    body: false,
    summary: "Establish a tunnel (e.g. HTTPS through an HTTP proxy).",
  },
};

export const HEADER_TIPS: Record<string, string> = {
  host: "Required in HTTP/1.1. Selects the virtual host when many sites share one IP.",
  "content-type": "Describes the media type of the body (e.g. application/json).",
  "content-length": "Exact body size in bytes. Used for message framing without chunking.",
  "transfer-encoding": "HTTP/1.1 framing (e.g. chunked). Forbidden in HTTP/2 and HTTP/3.",
  connection: "Hop-by-hop options like keep-alive. Forbidden as a header in HTTP/2 and HTTP/3.",
  accept: "Media types the client is willing to receive.",
  "user-agent": "Identifies the client software.",
  authorization: "Credentials for the request (e.g. Bearer token). Treat as secret.",
  cookie: "Stored cookies the browser would send for this origin.",
  "set-cookie": "Server directive to store a cookie; may appear multiple times.",
  location: "Redirect target URL for 3xx responses.",
  "cache-control": "Caching directives for intermediaries and browsers.",
};

export function statusClass(code: number): {
  className: string;
  label: string;
  summary: string;
} {
  if (code >= 100 && code < 200)
    return {
      className: "1xx",
      label: "Informational",
      summary: "Request received, continuing process.",
    };
  if (code >= 200 && code < 300)
    return {
      className: "2xx",
      label: "Success",
      summary: "Request succeeded.",
    };
  if (code >= 300 && code < 400)
    return {
      className: "3xx",
      label: "Redirection",
      summary: "Further action needed to complete the request.",
    };
  if (code >= 400 && code < 500)
    return {
      className: "4xx",
      label: "Client error",
      summary: "The request looks wrong or unauthorized.",
    };
  if (code >= 500)
    return {
      className: "5xx",
      label: "Server error",
      summary: "The server failed to fulfill a valid request.",
    };
  return { className: "unknown", label: "Unknown", summary: "" };
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Request line",
    summary: "HTTP/1.x first line: METHOD path HTTP/version",
    docs: [
      {
        label: "RFC 9112 §3 — Request line",
        url: "https://www.rfc-editor.org/rfc/rfc9112#name-request-line",
        source: "RFC",
      },
    ],
  },
  {
    term: "Pseudo-header",
    summary:
      "HTTP/2 and HTTP/3 fields like :method and :path that replace the request line.",
    docs: [
      {
        label: "RFC 9113 §8.3",
        url: "https://www.rfc-editor.org/rfc/rfc9113#name-http-control-data",
        source: "RFC",
      },
    ],
  },
  {
    term: "HPACK",
    summary: "Header compression for HTTP/2 using static/dynamic tables.",
    docs: [
      {
        label: "RFC 7541 — HPACK",
        url: "https://www.rfc-editor.org/rfc/rfc7541",
        source: "RFC",
      },
    ],
  },
  {
    term: "QPACK",
    summary: "Header compression for HTTP/3, designed for QUIC multiplexing.",
    docs: [
      {
        label: "RFC 9204 — QPACK",
        url: "https://www.rfc-editor.org/rfc/rfc9204",
        source: "RFC",
      },
    ],
  },
  {
    term: "ALPN",
    summary: "TLS extension that negotiates h2 vs http/1.1 during the handshake.",
    docs: [
      {
        label: "RFC 7301 — ALPN",
        url: "https://www.rfc-editor.org/rfc/rfc7301",
        source: "RFC",
      },
    ],
  },
  {
    term: "QUIC",
    summary: "UDP-based transport used by HTTP/3, with TLS 1.3 built in.",
    docs: [
      {
        label: "RFC 9000 — QUIC",
        url: "https://www.rfc-editor.org/rfc/rfc9000",
        source: "RFC",
      },
      {
        label: "MDN: QUIC",
        url: "https://developer.mozilla.org/en-US/docs/Glossary/QUIC",
        source: "MDN",
      },
    ],
  },
];
