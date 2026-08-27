import type { ComposedRequest, HttpVersion, RequestAssertion } from "../types";
import {
  TEACH_JWT_BAD_SIGNATURE,
  TEACH_JWT_EXPIRED,
  TEACH_JWT_VALID,
} from "./teach-jwt-tokens";

export interface Preset {
  id: string;
  title: string;
  description: string;
  request: ComposedRequest;
}

function assertion(
  id: string,
  kind: RequestAssertion["kind"],
  expected: string,
  target?: string
): RequestAssertion {
  return { id, kind, expected, target };
}

function base(
  partial: Partial<ComposedRequest> &
    Pick<ComposedRequest, "method" | "url" | "headerText">
): ComposedRequest {
  return {
    version: (partial.version || "1.1") as HttpVersion,
    method: partial.method,
    url: partial.url,
    headerText: partial.headerText,
    body: partial.body ?? "",
    allowPrivateTargets: false,
    sendAnyway: false,
    followRedirects: partial.followRedirects ?? false,
    maxRedirects: partial.maxRedirects ?? 5,
    useCookieJar: partial.useCookieJar ?? false,
    protocol: partial.protocol ?? "http",
    bodyType: partial.bodyType ?? "text",
    graphqlVariables: partial.graphqlVariables ?? "{}",
    multipartFields: partial.multipartFields ?? [],
    encodeLab: partial.encodeLab,
    teachLab: partial.teachLab,
    assertions: partial.assertions ?? [],
  };
}

export const PRESETS: Preset[] = [
  {
    id: "httpbin-get",
    title: "httpbin GET",
    description: "Valid HTTP/1.1 GET with Host and Accept.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "missing-host",
    title: "Lab: Missing Host (1.1)",
    description: "Omits Host — validation should fail for HTTP/1.1.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Accept: */*
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "post-json",
    title: "POST JSON",
    description: "POST with Content-Type and body.",
    request: base({
      version: "1.1",
      method: "POST",
      url: "https://httpbin.org/post",
      headerText: `Host: httpbin.org
Content-Type: application/json
Accept: application/json`,
      body: '{\n  "hello": "world"\n}',
    }),
  },
  {
    id: "custom-headers",
    title: "Lab: Custom headers",
    description:
      "Send X-Lab-Trace and X-Request-Source — httpbin /headers echoes them in the JSON body.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/headers",
      headerText: `Host: httpbin.org
Accept: application/json
X-Lab-Trace: abc-123
X-Request-Source: http-learning-checker
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [
        assertion("as-ch-trace", "body_contains", "X-Lab-Trace"),
        assertion("as-ch-source", "body_contains", "http-learning-checker"),
      ],
    }),
  },
  {
    id: "query-params",
    title: "Lab: Query parameters",
    description:
      "URL query string ?course=http&lesson=3&debug=true — httpbin /get echoes args in the response.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/get?course=http&lesson=3&debug=true",
      headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [
        assertion("as-qp-course", "body_contains", '"course": "http"'),
        assertion("as-qp-lesson", "body_contains", '"lesson": "3"'),
        assertion("as-qp-debug", "body_contains", '"debug": "true"'),
      ],
    }),
  },
  {
    id: "basic-auth",
    title: "Lab: Basic auth",
    description:
      "Authorization: Basic for httpbin /basic-auth/learner/secret — 401 without credentials, 200 when correct.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/basic-auth/learner/secret",
      headerText: `Host: httpbin.org
Accept: application/json
Authorization: Basic bGVhcm5lcjpzZWNyZXQ=
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [
        assertion("as-basic-status", "status", "200"),
        assertion("as-basic-user", "body_contains", '"user": "learner"'),
        assertion("as-basic-auth", "body_contains", '"authenticated": true'),
      ],
    }),
  },
  {
    id: "bearer-auth",
    title: "Lab: Bearer token",
    description:
      "Authorization: Bearer — httpbin /bearer requires a token; 401 if missing or wrong.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/bearer",
      headerText: `Host: httpbin.org
Accept: application/json
Authorization: Bearer lab-token-42
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [
        assertion("as-bearer-status", "status", "200"),
        assertion("as-bearer-token", "body_contains", "lab-token-42"),
        assertion("as-bearer-auth", "body_contains", '"authenticated": true'),
      ],
    }),
  },
  {
    id: "jwt-bearer",
    title: "Lab: JWT Bearer",
    description:
      "teach.local/jwt — validates HS256 signature and exp; Response panel decodes header.payload.signature.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://teach.local/jwt",
      headerText: `Host: teach.local
Accept: application/json
Authorization: Bearer ${TEACH_JWT_VALID}
User-Agent: HTTP-Learning-Checker/1.0`,
      teachLab: "jwt",
      assertions: [
        assertion("as-jwt-status", "status", "200"),
        assertion("as-jwt-auth", "body_contains", '"authenticated": true'),
        assertion("as-jwt-sub", "body_contains", '"sub": "learner"'),
      ],
    }),
  },
  {
    id: "jwt-expired",
    title: "Lab: JWT expired",
    description:
      "Valid signature but exp in the past → 401 (same Bearer header shape as opaque tokens).",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://teach.local/jwt",
      headerText: `Host: teach.local
Accept: application/json
Authorization: Bearer ${TEACH_JWT_EXPIRED}
User-Agent: HTTP-Learning-Checker/1.0`,
      teachLab: "jwt",
      assertions: [
        assertion("as-jwt-exp-status", "status", "401"),
        assertion("as-jwt-exp-reason", "body_contains", "token_expired"),
      ],
    }),
  },
  {
    id: "jwt-bad-signature",
    title: "Lab: JWT bad signature",
    description:
      "Tampered signature segment → 401 even when payload looks valid.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://teach.local/jwt",
      headerText: `Host: teach.local
Accept: application/json
Authorization: Bearer ${TEACH_JWT_BAD_SIGNATURE}
User-Agent: HTTP-Learning-Checker/1.0`,
      teachLab: "jwt",
      assertions: [
        assertion("as-jwt-sig-status", "status", "401"),
        assertion("as-jwt-sig-reason", "body_contains", "invalid_signature"),
      ],
    }),
  },
  {
    id: "api-key-header",
    title: "Lab: API key (header)",
    description:
      "Custom X-API-Key header — httpbin /headers echoes it; compare with Auth tab → API key.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/headers",
      headerText: `Host: httpbin.org
Accept: application/json
X-API-Key: lab-key-99
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [
        assertion("as-apikey-hdr", "body_contains", "X-Api-Key"),
        assertion("as-apikey-val", "body_contains", "lab-key-99"),
      ],
    }),
  },
  {
    id: "post-no-cl",
    title: "Lab: POST without Content-Length",
    description: "Body present but no Content-Length — warning, app may inject on send.",
    request: base({
      version: "1.1",
      method: "POST",
      url: "https://httpbin.org/post",
      headerText: `Host: httpbin.org
Content-Type: text/plain`,
      body: "payload",
    }),
  },
  {
    id: "get-with-body",
    title: "Lab: GET with body",
    description: "Unusual GET + body — expect a warning.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Host: httpbin.org
Content-Type: text/plain`,
      body: "should-not-matter",
    }),
  },
  {
    id: "http2-get",
    title: "HTTP/2 GET",
    description: "Same GET for HTTP/2 — inspect pseudo-headers and HPACK frames.",
    request: base({
      version: "2",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "http3-get",
    title: "HTTP/3 GET (Cloudflare)",
    description: "h3-capable target — try Send for live QUIC when transport is available.",
    request: base({
      version: "3",
      method: "GET",
      url: "https://cloudflare.com/",
      headerText: `Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "http3-www-cf",
    title: "Lab: H3-only style target",
    description: "www.cloudflare.com often speaks HTTP/3 — inspect Alt-Svc after Send.",
    request: base({
      version: "3",
      method: "GET",
      url: "https://www.cloudflare.com/",
      headerText: `Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "http3-authority-from-url",
    title: "Lab: H3 :authority from URL",
    description: "No Host header — Encode still sets :authority from the URL (not Host).",
    request: base({
      version: "3",
      method: "GET",
      url: "https://cloudflare.com/",
      headerText: `Accept: */*
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "http3-forbidden-connection",
    title: "Lab: Connection header on H3",
    description: "Connection is forbidden in HTTP/3 — validation error.",
    request: base({
      version: "3",
      method: "GET",
      url: "https://cloudflare.com/",
      headerText: `Connection: keep-alive
Accept: */*`,
    }),
  },
  {
    id: "lesson-hpack-qpack",
    title: "Lesson: HPACK vs QPACK",
    description: "Same logical GET — use Compare 2 vs 3 to study HPACK vs QPACK side by side.",
    request: base({
      version: "2",
      method: "GET",
      url: "https://cloudflare.com/",
      headerText: `Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "duplicate-accept-h2",
    title: "Lab: Duplicate Accept (H2)",
    description:
      "Two Accept lines — Validate warns; Send keeps the last value only.",
    request: base({
      version: "2",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Accept: application/json
Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "duplicate-accept-h3",
    title: "Lab: Duplicate Accept (H3)",
    description:
      "Same duplicate-header lesson on HTTP/3 — last value wins on Send.",
    request: base({
      version: "3",
      method: "GET",
      url: "https://cloudflare.com/",
      headerText: `Accept: text/html
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "duplicate-accept-http11",
    title: "Lab: Duplicate Accept (1.1)",
    description:
      "HTTP/1.1 may send both lines; servers may combine or pick one.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Host: httpbin.org
Accept: application/json
Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
    }),
  },
  {
    id: "h2-forbidden-connection",
    title: "Lab: Connection header on H2",
    description: "Connection is forbidden in HTTP/2 — validation error.",
    request: base({
      version: "2",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Connection: keep-alive
Accept: */*`,
    }),
  },
  {
    id: "redirect-302",
    title: "Lab: Redirect (302)",
    description:
      "httpbin /redirect/2 — Send without follow to see 302 + Location; enable Follow redirects to see hop timeline. Ships with status assertion.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/redirect/2",
      headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
      followRedirects: false,
      assertions: [assertion("as-redirect-status", "status", "302")],
    }),
  },
  {
    id: "set-cookie-response",
    title: "Lab: Set-Cookie response",
    description:
      "httpbin /cookies/set — Follow redirects off to see 302 + Set-Cookie. Enable Cookie jar + Follow redirects to apply cookies on the next hop.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/cookies/set?session=abc123&theme=dark",
      headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
      followRedirects: false,
      assertions: [
        assertion("as-setcookie-status", "status", "302"),
        assertion("as-setcookie-hdr", "header", "session", "set-cookie"),
      ],
    }),
  },
  {
    id: "range-206",
    title: "Lab: Range (206)",
    description:
      "Range: bytes=0-99 against httpbin /range/1024 — expect 206 + Content-Range.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/range/1024",
      headerText: `Host: httpbin.org
Range: bytes=0-99
Accept: */*
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [
        assertion("as-range-status", "status", "206"),
        assertion("as-range-cr", "header", "bytes", "content-range"),
      ],
    }),
  },
  {
    id: "conditional-304",
    title: "Lab: Conditional GET (304)",
    description:
      "If-None-Match against httpbin /etag — 304 when the ETag matches. (If-Modified-Since is a separate lab: /etag does not evaluate it.)",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/etag/abc123",
      headerText: `Host: httpbin.org
If-None-Match: "abc123"
Accept: */*
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [assertion("as-cond-status", "status", "304")],
    }),
  },
  {
    id: "conditional-304-ims",
    title: "Lab: If-Modified-Since (304)",
    description:
      "In-app teach lab with correct date compare (Last-Modified ≤ If-Modified-Since → 304). Not httpbin /cache — that endpoint 304s if the header is merely present.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://teach.local/if-modified-since",
      headerText: `Host: teach.local
If-Modified-Since: Wed, 21 Oct 2015 07:28:00 GMT
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
      teachLab: "if-modified-since",
      assertions: [assertion("as-ims-status", "status", "304")],
    }),
  },
  {
    id: "conditional-ims-stale",
    title: "Lab: If-Modified-Since (200 stale)",
    description:
      "Same teach resource, but If-Modified-Since is older than Last-Modified → 200 full body (client cache is stale).",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://teach.local/if-modified-since",
      headerText: `Host: teach.local
If-Modified-Since: Mon, 19 Oct 2015 07:28:00 GMT
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
      teachLab: "if-modified-since",
      assertions: [
        assertion("as-ims-stale-status", "status", "200"),
        assertion("as-ims-stale-lm", "header", "2015", "last-modified"),
      ],
    }),
  },
  {
    id: "cache-control",
    title: "Lab: Cache-Control",
    description:
      "httpbin /cache/60 — Cache-Control, Date, Age/Expires when present; Response panel shows freshness precedence (max-age vs Expires vs Age).",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/cache/60",
      headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [
        assertion("as-cache-status", "status", "200"),
        assertion("as-cache-cc", "header", "max-age", "cache-control"),
      ],
    }),
  },
  {
    id: "cache-precedence",
    title: "Lab: Age / Expires precedence",
    description:
      "Injects Cache-Control max-age, Expires, and Age together — Response panel shows which freshness signal wins.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/response-headers?Cache-Control=max-age%3D120&Expires=Thu%2C%2001%20Jan%202030%2000%3A00%3A00%20GMT&Age=30",
      headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [
        assertion("as-prec-cc", "header", "max-age", "cache-control"),
        assertion("as-prec-age", "header", "30", "age"),
        assertion("as-prec-exp", "header", "2030", "expires"),
      ],
    }),
  },
  {
    id: "hsts-header",
    title: "Lab: HSTS header",
    description:
      "httpbin injects Strict-Transport-Security via query — observe HSTS teaching on Response.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/response-headers?Strict-Transport-Security=max-age%3D31536000%3B%20includeSubDomains",
      headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [
        assertion(
          "as-hsts-hdr",
          "header",
          "max-age",
          "strict-transport-security"
        ),
      ],
    }),
  },
  {
    id: "cors-headers",
    title: "Lab: CORS headers",
    description:
      "Access-Control-Allow-* via httpbin — compare with CORS teaching panel (browser vs Node proxy).",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/response-headers?Access-Control-Allow-Origin=*&Access-Control-Allow-Methods=GET%2CPOST",
      headerText: `Host: httpbin.org
Accept: application/json
Origin: https://example.com
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [
        assertion(
          "as-cors-acao",
          "header",
          "*",
          "access-control-allow-origin"
        ),
      ],
    }),
  },
  {
    id: "websocket-echo",
    title: "WebSocket echo",
    description:
      "wss://echo.websocket.org — Send opens relay, optional outbound message echoed back.",
    request: base({
      version: "1.1",
      method: "GET",
      url: "wss://echo.websocket.org",
      headerText: "",
      protocol: "websocket",
      wsOutboundMessage: "Hello",
    }),
  },
  {
    id: "cl-te-smuggling",
    title: "Lab: CL + TE (encode only)",
    description:
      "Ambiguous Content-Length + Transfer-Encoding — Encode to study smuggling risk. Do not Send to systems you do not own.",
    request: base({
      version: "1.1",
      method: "POST",
      url: "https://httpbin.org/post",
      headerText: `Host: httpbin.org
Transfer-Encoding: chunked
Content-Length: 13
Content-Type: text/plain`,
      body: "smuggle-demo",
      encodeLab: "cl-te-smuggle",
      sendAnyway: false,
    }),
  },
  {
    id: "chunked-encoding",
    title: "Lab: Chunked encoding",
    description:
      "Transfer-Encoding: chunked — Encode to see chunked wire format.",
    request: base({
      version: "1.1",
      method: "POST",
      url: "https://httpbin.org/post",
      headerText: `Host: httpbin.org
Content-Type: text/plain
Transfer-Encoding: chunked`,
      body: "chunked payload",
      encodeLab: "chunked",
    }),
  },
  {
    id: "h2-trailers",
    title: "Lab: H2 trailers encode",
    description: "HTTP/2 trailing HEADERS frame after DATA (Encode tab).",
    request: base({
      version: "2",
      method: "POST",
      url: "https://httpbin.org/post",
      headerText: `Content-Type: application/json
Accept: application/json`,
      body: '{"trailers": true}',
      encodeLab: "h2-trailers",
    }),
  },
  {
    id: "h2-push",
    title: "Lab: H2 server push encode",
    description: "Educational PUSH_PROMISE frame in Encode view.",
    request: base({
      version: "2",
      method: "GET",
      url: "https://httpbin.org/get",
      headerText: `Accept: text/html
User-Agent: HTTP-Learning-Checker/1.0`,
      encodeLab: "h2-push",
    }),
  },
];
