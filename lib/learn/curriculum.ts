export interface CurriculumStep {
  title: string;
  description: string;
  presetId?: string;
}

export interface Curriculum {
  id: string;
  title: string;
  description: string;
  steps: CurriculumStep[];
}

export const CURRICULA: Curriculum[] = [
  {
    id: "http11-basics",
    title: "HTTP/1.1 basics",
    description: "Request shape, Host, and wire format.",
    steps: [
      {
        title: "Valid GET",
        description: "Load httpbin GET → Validate → Encode → Send.",
        presetId: "httpbin-get",
      },
      {
        title: "Custom headers",
        description: "X-Lab-Trace on /headers — echo in response + Wire.",
        presetId: "custom-headers",
      },
      {
        title: "Query parameters",
        description: "URL args via Params tab → httpbin /get echo.",
        presetId: "query-params",
      },
      {
        title: "Basic auth",
        description: "Authorization: Basic → /basic-auth → 200 vs 401.",
        presetId: "basic-auth",
      },
      {
        title: "Bearer token",
        description: "Authorization: Bearer → httpbin /bearer.",
        presetId: "bearer-auth",
      },
      {
        title: "JWT Bearer",
        description: "teach.local/jwt — signature + exp teaching.",
        presetId: "jwt-bearer",
      },
      {
        title: "Missing Host lab",
        description: "See validation fail; try Send anyway.",
        presetId: "missing-host",
      },
      {
        title: "Chunked encoding",
        description: "Encode tab → inspect chunked wire framing.",
        presetId: "chunked-encoding",
      },
      {
        title: "Redirect chain",
        description: "Toggle Follow redirects and compare hop timeline.",
        presetId: "redirect-302",
      },
      {
        title: "Range / 206",
        description: "Partial content with Range header.",
        presetId: "range-206",
      },
      {
        title: "Conditional GET (ETag)",
        description: "If-None-Match → 304 Not Modified.",
        presetId: "conditional-304",
      },
      {
        title: "If-Modified-Since (304)",
        description: "Correct date compare on teach.local (not httpbin /cache).",
        presetId: "conditional-304-ims",
      },
      {
        title: "If-Modified-Since (200)",
        description: "Stale client date → full 200 body.",
        presetId: "conditional-ims-stale",
      },
    ],
  },
  {
    id: "request-parts",
    title: "Headers, query & auth",
    description: "Custom headers, URL parameters, and Authorization schemes.",
    steps: [
      {
        title: "Custom headers",
        description: "X-Lab-Trace echoed by httpbin /headers.",
        presetId: "custom-headers",
      },
      {
        title: "Query parameters",
        description: "Edit Params tab; httpbin /get echoes args.",
        presetId: "query-params",
      },
      {
        title: "Basic auth",
        description: "Auth tab or Authorization header → 200 vs 401.",
        presetId: "basic-auth",
      },
      {
        title: "Bearer token",
        description: "Bearer scheme on httpbin /bearer.",
        presetId: "bearer-auth",
      },
      {
        title: "JWT Bearer",
        description: "teach.local — HS256 verify + exp; decode panel.",
        presetId: "jwt-bearer",
      },
      {
        title: "JWT expired",
        description: "Valid sig, past exp → 401.",
        presetId: "jwt-expired",
      },
      {
        title: "API key (header)",
        description: "X-API-Key via header or Auth tab.",
        presetId: "api-key-header",
      },
    ],
  },
  {
    id: "cookies-cors-security",
    title: "Cookies, CORS & security headers",
    description: "Set-Cookie jar, CORS vs proxy, HSTS and cache.",
    steps: [
      {
        title: "Set-Cookie + jar",
        description: "302 Set-Cookie, then jar + follow redirects.",
        presetId: "set-cookie-response",
      },
      {
        title: "CORS headers",
        description: "Observe ACAO; read CORS teaching panel.",
        presetId: "cors-headers",
      },
      {
        title: "HSTS",
        description: "Strict-Transport-Security on Response.",
        presetId: "hsts-header",
      },
      {
        title: "Cache-Control",
        description: "Cache directives from httpbin /cache/60.",
        presetId: "cache-control",
      },
      {
        title: "Age / Expires precedence",
        description: "max-age vs Expires vs Age on one response.",
        presetId: "cache-precedence",
      },
    ],
  },
  {
    id: "h2-h3",
    title: "HTTP/2 & HTTP/3",
    description: "Multiplexing, HPACK/QPACK, and binary frames.",
    steps: [
      {
        title: "Multiplex simulator",
        description: "Run the animated H1 vs H2 vs H3 load demo.",
      },
      {
        title: "Compare 1.1 vs 2",
        description: "Load HTTP/2 GET → Compare 1.1 vs 2.",
        presetId: "http2-get",
      },
      {
        title: "H2 trailers encode",
        description: "Lab preset → Encode → trailing HEADERS frame.",
        presetId: "h2-trailers",
      },
      {
        title: "H2 server push encode",
        description: "Lab preset → Encode → PUSH_PROMISE frame.",
        presetId: "h2-push",
      },
      {
        title: "HTTP/3 + Alt-Svc",
        description: "Send to Cloudflare → QUIC timeline + TLS panel.",
        presetId: "http3-get",
      },
    ],
  },
  {
    id: "client-tools",
    title: "Client & intercept tools",
    description: "Collections, mocks, rewrites, and traffic log.",
    steps: [
      {
        title: "Environments",
        description: "Set {{baseUrl}} and substitute in URL.",
      },
      {
        title: "Mock + breakpoint",
        description: "Create mock rule with Breakpoint → edit response.",
      },
      {
        title: "Rewrite on Send",
        description: "Inject header or replace body substring.",
      },
      {
        title: "Session traffic + HAR",
        description: "Send twice → traffic log → Copy HAR.",
      },
    ],
  },
];
