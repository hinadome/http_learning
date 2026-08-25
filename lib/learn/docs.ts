import type { HttpVersion } from "../types";

export interface DocLink {
  label: string;
  url: string;
  source: "RFC" | "MDN" | "IETF" | "Guide";
}

/** Curated official docs for validating app behavior against specs. */
export const VERSION_DOCS: Record<HttpVersion, DocLink[]> = {
  "1.0": [
    {
      label: "RFC 1945 — HTTP/1.0",
      url: "https://www.rfc-editor.org/rfc/rfc1945",
      source: "RFC",
    },
    {
      label: "MDN: HTTP overview",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview",
      source: "MDN",
    },
  ],
  "1.1": [
    {
      label: "RFC 9112 — HTTP/1.1 messaging",
      url: "https://www.rfc-editor.org/rfc/rfc9112",
      source: "RFC",
    },
    {
      label: "RFC 9110 — HTTP semantics",
      url: "https://www.rfc-editor.org/rfc/rfc9110",
      source: "RFC",
    },
    {
      label: "MDN: HTTP headers",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers",
      source: "MDN",
    },
  ],
  "2": [
    {
      label: "RFC 9113 — HTTP/2",
      url: "https://www.rfc-editor.org/rfc/rfc9113",
      source: "RFC",
    },
    {
      label: "RFC 7541 — HPACK",
      url: "https://www.rfc-editor.org/rfc/rfc7541",
      source: "RFC",
    },
    {
      label: "MDN: HTTP/2",
      url: "https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2",
      source: "MDN",
    },
  ],
  "3": [
    {
      label: "RFC 9114 — HTTP/3",
      url: "https://www.rfc-editor.org/rfc/rfc9114",
      source: "RFC",
    },
    {
      label: "RFC 9204 — QPACK",
      url: "https://www.rfc-editor.org/rfc/rfc9204",
      source: "RFC",
    },
    {
      label: "RFC 9000 — QUIC",
      url: "https://www.rfc-editor.org/rfc/rfc9000",
      source: "RFC",
    },
    {
      label: "MDN: HTTP/3",
      url: "https://developer.mozilla.org/en-US/docs/Glossary/HTTP_3",
      source: "MDN",
    },
  ],
};

export const ISSUE_DOCS: Record<string, DocLink[]> = {
  host_required_11: [
    {
      label: "RFC 9112 §3.2 — Host required",
      url: "https://www.rfc-editor.org/rfc/rfc9112#section-3.2",
      source: "RFC",
    },
    {
      label: "MDN: Host header",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Host",
      source: "MDN",
    },
  ],
  host_optional_10: [
    {
      label: "RFC 1945 — HTTP/1.0",
      url: "https://www.rfc-editor.org/rfc/rfc1945",
      source: "RFC",
    },
    {
      label: "MDN: Host header",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Host",
      source: "MDN",
    },
  ],
  host_mismatch: [
    {
      label: "RFC 9112 §3.2 — Host / authority",
      url: "https://www.rfc-editor.org/rfc/rfc9112#section-3.2",
      source: "RFC",
    },
  ],
  cl_and_te: [
    {
      label: "RFC 9112 §6.3 — Content-Length vs Transfer-Encoding",
      url: "https://www.rfc-editor.org/rfc/rfc9112#name-message-body-length",
      source: "RFC",
    },
  ],
  body_no_framing: [
    {
      label: "RFC 9112 §6 — Message body length",
      url: "https://www.rfc-editor.org/rfc/rfc9112#name-message-body-length",
      source: "RFC",
    },
    {
      label: "MDN: Content-Length",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Length",
      source: "MDN",
    },
  ],
  bad_content_length: [
    {
      label: "MDN: Content-Length",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Length",
      source: "MDN",
    },
  ],
  content_length_mismatch: [
    {
      label: "MDN: Content-Length",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Length",
      source: "MDN",
    },
  ],
  te_chunked_http10: [
    {
      label: "MDN: Transfer-Encoding",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Transfer-Encoding",
      source: "MDN",
    },
  ],
  connection_specific: [
    {
      label: "RFC 9113 §8.2 — Connection-specific headers",
      url: "https://www.rfc-editor.org/rfc/rfc9113#name-connection-specific-header-",
      source: "RFC",
    },
    {
      label: "RFC 9114 §4.2 — HTTP/3 header fields",
      url: "https://www.rfc-editor.org/rfc/rfc9114#name-http-header-fields",
      source: "RFC",
    },
  ],
  duplicate_header_http1: [
    {
      label: "RFC 9110 §5.3 — Field values (combining)",
      url: "https://www.rfc-editor.org/rfc/rfc9110#name-field-values",
      source: "RFC",
    },
    {
      label: "MDN: HTTP headers",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers",
      source: "MDN",
    },
  ],
  duplicate_header_h2h3: [
    {
      label: "RFC 9113 §8.3 — Pseudo-headers (must be unique)",
      url: "https://www.rfc-editor.org/rfc/rfc9113#name-request-pseudo-header-field",
      source: "RFC",
    },
    {
      label: "RFC 9110 §5.3 — Field values",
      url: "https://www.rfc-editor.org/rfc/rfc9110#name-field-values",
      source: "RFC",
    },
    {
      label: "MDN: HTTP headers",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers",
      source: "MDN",
    },
  ],
  host_to_authority: [
    {
      label: "RFC 9113 §8.3.1 — Pseudo-header fields",
      url: "https://www.rfc-editor.org/rfc/rfc9113#name-request-pseudo-header-field",
      source: "RFC",
    },
  ],
  pseudo_headers: [
    {
      label: "RFC 9113 §8.3 — HTTP/2 pseudo-headers",
      url: "https://www.rfc-editor.org/rfc/rfc9113#name-http-control-data",
      source: "RFC",
    },
    {
      label: "RFC 9114 §4.3 — HTTP/3 HTTP control data",
      url: "https://www.rfc-editor.org/rfc/rfc9114#name-http-control-data",
      source: "RFC",
    },
  ],
  header_case: [
    {
      label: "RFC 9113 §8.2 — Field names lowercase",
      url: "https://www.rfc-editor.org/rfc/rfc9113#name-http-header-fields",
      source: "RFC",
    },
  ],
  get_with_body: [
    {
      label: "RFC 9110 §9.3.1 — GET",
      url: "https://www.rfc-editor.org/rfc/rfc9110#name-get",
      source: "RFC",
    },
    {
      label: "MDN: GET",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/GET",
      source: "MDN",
    },
  ],
  unknown_method: [
    {
      label: "RFC 9110 §9 — Methods",
      url: "https://www.rfc-editor.org/rfc/rfc9110#name-methods",
      source: "RFC",
    },
    {
      label: "MDN: HTTP request methods",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods",
      source: "MDN",
    },
  ],
  bad_header_name: [
    {
      label: "RFC 9110 §5.1 — Field names",
      url: "https://www.rfc-editor.org/rfc/rfc9110#name-field-names",
      source: "RFC",
    },
  ],
  bad_header_line: [
    {
      label: "MDN: HTTP headers",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers",
      source: "MDN",
    },
  ],
};

export const HEADER_DOCS: Record<string, DocLink> = {
  host: {
    label: "MDN: Host",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Host",
    source: "MDN",
  },
  "content-type": {
    label: "MDN: Content-Type",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Type",
    source: "MDN",
  },
  "content-length": {
    label: "MDN: Content-Length",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Length",
    source: "MDN",
  },
  "transfer-encoding": {
    label: "MDN: Transfer-Encoding",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Transfer-Encoding",
    source: "MDN",
  },
  connection: {
    label: "MDN: Connection",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Connection",
    source: "MDN",
  },
  accept: {
    label: "MDN: Accept",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept",
    source: "MDN",
  },
  "user-agent": {
    label: "MDN: User-Agent",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/User-Agent",
    source: "MDN",
  },
  authorization: {
    label: "MDN: Authorization",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization",
    source: "MDN",
  },
  cookie: {
    label: "MDN: Cookie",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cookie",
    source: "MDN",
  },
  "cache-control": {
    label: "MDN: Cache-Control",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control",
    source: "MDN",
  },
  "set-cookie": {
    label: "MDN: Set-Cookie",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie",
    source: "MDN",
  },
  server: {
    label: "MDN: Server",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Server",
    source: "MDN",
  },
  date: {
    label: "MDN: Date",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Date",
    source: "MDN",
  },
  location: {
    label: "MDN: Location",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Location",
    source: "MDN",
  },
  "access-control-allow-origin": {
    label: "MDN: Access-Control-Allow-Origin",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin",
    source: "MDN",
  },
};

export const METHOD_DOCS: Record<string, DocLink> = {
  GET: {
    label: "MDN: GET",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/GET",
    source: "MDN",
  },
  HEAD: {
    label: "MDN: HEAD",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/HEAD",
    source: "MDN",
  },
  POST: {
    label: "MDN: POST",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/POST",
    source: "MDN",
  },
  PUT: {
    label: "MDN: PUT",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/PUT",
    source: "MDN",
  },
  PATCH: {
    label: "MDN: PATCH",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/PATCH",
    source: "MDN",
  },
  DELETE: {
    label: "MDN: DELETE",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/DELETE",
    source: "MDN",
  },
  OPTIONS: {
    label: "MDN: OPTIONS",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/OPTIONS",
    source: "MDN",
  },
  TRACE: {
    label: "MDN: TRACE",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/TRACE",
    source: "MDN",
  },
  CONNECT: {
    label: "MDN: CONNECT",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/CONNECT",
    source: "MDN",
  },
};

export function statusDocs(code: number): DocLink {
  return {
    label: `MDN: ${code}`,
    url: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/${code}`,
    source: "MDN",
  };
}

export function docsForIssue(code: string): DocLink[] {
  return ISSUE_DOCS[code] ?? [];
}

export function docsForHeader(name: string): DocLink | undefined {
  return HEADER_DOCS[name.toLowerCase()];
}

export function docsForMethod(method: string): DocLink | undefined {
  return METHOD_DOCS[method.toUpperCase()];
}
