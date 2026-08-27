import type { ComposedRequest, HttpVersion, RequestAssertion } from "../types";

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
      "If-Modified-Since against httpbin /cache — 304 when the header is present (clock-based validator; weaker than ETag).",
    request: base({
      version: "1.1",
      method: "GET",
      url: "https://httpbin.org/cache",
      headerText: `Host: httpbin.org
If-Modified-Since: Wed, 21 Oct 2015 07:28:00 GMT
Accept: */*
User-Agent: HTTP-Learning-Checker/1.0`,
      assertions: [assertion("as-ims-status", "status", "304")],
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
