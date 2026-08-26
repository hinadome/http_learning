import { docsForIssue } from "../learn/docs";
import {
  getHeader,
  hasHeader,
  isHttpUrlTarget,
  parseComposedRequest,
} from "../parse";
import type {
  ComposedRequest,
  ValidationIssue,
  ValidationResult,
} from "../types";

const KNOWN_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "TRACE",
  "CONNECT",
]);

const CONNECTION_SPECIFIC = new Set([
  "connection",
  "transfer-encoding",
  "upgrade",
  "keep-alive",
  "proxy-connection",
]);

const HEADER_NAME_RE =
  /^(\:[a-zA-Z0-9!#$%&'*+\-.^_`|~]+|[!#$%&'*+\-.^_`|~0-9A-Za-z]+)$/;

function badHeaderLineHint(line: number, raw: string): string {
  const trimmed = raw.trim();
  if (line > 3) {
    return `Line ${line}: header must look like "Name: value". Check Rewrite panel — an enabled inject rule may add lines not shown in the editor.`;
  }
  if (/^set-cookie(\s|$)/i.test(trimmed) && !/^set-cookie\s*:/i.test(trimmed)) {
    return `Line ${line}: use "Set-Cookie: value" (colon after the name). For the Set-Cookie lab, leave request headers as the preset — httpbin returns Set-Cookie on the response.`;
  }
  if (
    /^(path|domain|expires|max-age|samesite|secure|httponly)$/i.test(trimmed)
  ) {
    return `Line ${line}: "${trimmed}" is a cookie attribute, not a request header line. Remove it from request headers.`;
  }
  if (/^[\w.-]+=[^:]*$/.test(trimmed)) {
    return `Line ${line}: looks like "name=value" without a header name. To send a cookie use "Cookie: ${trimmed}", or remove the line for the Set-Cookie response lab.`;
  }
  if (/^cookie\s+\S/i.test(trimmed) && !/^cookie\s*:/i.test(trimmed)) {
    return `Line ${line}: use "Cookie: name=value" (colon after Cookie).`;
  }
  return `Line ${line}: header must look like "Name: value".`;
}

function issue(
  severity: ValidationIssue["severity"],
  code: string,
  message: string,
  field?: string
): ValidationIssue {
  const docs = docsForIssue(code);
  return {
    severity,
    code,
    message,
    field,
    ...(docs.length ? { docs } : {}),
  };
}

export function validateRequest(req: ComposedRequest): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!req.url?.trim()) {
    issues.push(issue("error", "missing_url", "URL is required.", "url"));
    return { ok: false, issues };
  }

  let parsed;
  try {
    parsed = parseComposedRequest(req);
  } catch {
    issues.push(
      issue(
        "error",
        "invalid_url",
        "URL is invalid. Use an absolute URL like https://httpbin.org/get",
        "url"
      )
    );
    return { ok: false, issues };
  }

  if (!KNOWN_METHODS.has(parsed.method)) {
    issues.push(
      issue(
        "warning",
        "unknown_method",
        `Method "${parsed.method}" is non-standard. Servers may reject it.`,
        "method"
      )
    );
  }

  const appProtocol = req.protocol ?? "http";
  const usesHttpWireRules =
    appProtocol !== "websocket" &&
    appProtocol !== "mqtt" &&
    isHttpUrlTarget(parsed.target);

  if (!usesHttpWireRules && (appProtocol === "websocket" || appProtocol === "mqtt")) {
    issues.push(
      issue(
        "info",
        "non_http_protocol",
        appProtocol === "websocket"
          ? "WebSocket mode: HTTP Host and HTTP/2 wire rules are skipped. URL must be ws: or wss:; Send uses the WebSocket relay (headers below are not sent as HTTP)."
          : "MQTT mode: HTTP Host and HTTP/2 wire rules are skipped. URL is the broker; Send uses the MQTT bridge.",
        "protocol"
      )
    );
  }

  for (const h of parsed.headers) {
    const headerSeverity = usesHttpWireRules ? "error" : "info";
    if (!h.name) {
      issues.push(
        issue(
          headerSeverity,
          "bad_header_line",
          usesHttpWireRules
            ? badHeaderLineHint(h.line, h.raw)
            : `Line ${h.line}: not a "Name: value" line (ignored in ${appProtocol} mode — headers are not sent as HTTP).`,
          "headers"
        )
      );
      continue;
    }
    if (!HEADER_NAME_RE.test(h.name)) {
      issues.push(
        issue(
          headerSeverity,
          "bad_header_name",
          usesHttpWireRules
            ? `Line ${h.line}: invalid header name "${h.name}".`
            : `Line ${h.line}: header name "${h.name}" is not used in ${appProtocol} mode.`,
          "headers"
        )
      );
    }
    if (/[\r\n]/.test(h.value)) {
      issues.push(
        issue(
          headerSeverity,
          "header_newline",
          `Line ${h.line}: header values cannot contain newlines.`,
          "headers"
        )
      );
    }
  }

  // Duplicate header names (case-insensitive)
  const nameLines = new Map<string, number[]>();
  for (const h of parsed.headers) {
    if (!h.name) continue;
    const key = h.name.toLowerCase();
    const lines = nameLines.get(key) ?? [];
    lines.push(h.line);
    nameLines.set(key, lines);
  }
  for (const [name, lines] of nameLines) {
    if (lines.length < 2) continue;
    const display = parsed.headers.find(
      (h) => h.name.toLowerCase() === name
    )?.name;
    const label = display || name;
    const lineList = lines.join(", ");
    const lastValue =
      [...parsed.headers].reverse().find((h) => h.name.toLowerCase() === name)
        ?.value ?? "";

    if (parsed.version === "2" || parsed.version === "3") {
      issues.push(
        issue(
          "warning",
          "duplicate_header_h2h3",
          `Duplicate header "${label}" on lines ${lineList}. HTTP/${parsed.version} clients often keep only one value — this app’s Send uses the last one ("${lastValue}"). Prefer a single line (combine list values with commas if needed).`,
          "headers"
        )
      );
    } else {
      issues.push(
        issue(
          "warning",
          "duplicate_header_http1",
          `Duplicate header "${label}" on lines ${lineList}. HTTP/1.x can send multiple lines; servers may combine them, keep first/last, or reject. Prefer one line unless you are testing that behavior.`,
          "headers"
        )
      );
    }
  }

  const hasBody = parsed.body.length > 0;
  const contentLength = getHeader(parsed.headers, "Content-Length");
  const transferEncoding = getHeader(parsed.headers, "Transfer-Encoding");

  if (hasBody && parsed.method === "GET") {
    issues.push(
      issue(
        "warning",
        "get_with_body",
        "GET requests with a body are unusual and often ignored by servers.",
        "body"
      )
    );
  }

  if (hasBody && !contentLength && !transferEncoding) {
    if (parsed.version === "1.0" || parsed.version === "1.1") {
      issues.push(
        issue(
          "warning",
          "body_no_framing",
          "Body is present but neither Content-Length nor Transfer-Encoding is set. The app will add Content-Length when sending.",
          "headers"
        )
      );
    }
  }

  if (contentLength && transferEncoding) {
    issues.push(
      issue(
        "error",
        "cl_and_te",
        "Do not send both Content-Length and Transfer-Encoding (request smuggling risk). Prefer one framing method.",
        "headers"
      )
    );
  }

  if (contentLength) {
    const n = Number(contentLength.value);
    if (!Number.isFinite(n) || n < 0 || String(n) !== contentLength.value.trim()) {
      issues.push(
        issue(
          "error",
          "bad_content_length",
          "Content-Length must be a non-negative integer matching the body byte length.",
          "headers"
        )
      );
    } else {
      const byteLen = Buffer.byteLength(parsed.body, "utf8");
      if (n !== byteLen) {
        issues.push(
          issue(
            "warning",
            "content_length_mismatch",
            `Content-Length is ${n} but body is ${byteLen} bytes (UTF-8).`,
            "headers"
          )
        );
      }
    }
  }

  // Version-specific HTTP wire rules (skip for WebSocket / MQTT / non-http(s) URLs)
  if (parsed.version === "1.0" && usesHttpWireRules) {
    if (transferEncoding?.value.toLowerCase().includes("chunked")) {
      issues.push(
        issue(
          "error",
          "te_chunked_http10",
          "Transfer-Encoding: chunked is not part of HTTP/1.0.",
          "headers"
        )
      );
    }
    if (!hasHeader(parsed.headers, "Host")) {
      issues.push(
        issue(
          "info",
          "host_optional_10",
          "Host is optional in HTTP/1.0, but many servers and proxies still expect it.",
          "headers"
        )
      );
    }
  }

  if (parsed.version === "1.1" && usesHttpWireRules) {
    if (!hasHeader(parsed.headers, "Host")) {
      issues.push(
        issue(
          "error",
          "host_required_11",
          "HTTP/1.1 requires a Host header (RFC 9112). Without it, servers should respond 400 Bad Request.",
          "headers"
        )
      );
    } else {
      const host = getHeader(parsed.headers, "Host")!;
      const expected =
        parsed.target.port &&
        !(
          (parsed.target.protocol === "https:" && parsed.target.port === "443") ||
          (parsed.target.protocol === "http:" && parsed.target.port === "80")
        )
          ? `${parsed.target.hostname}:${parsed.target.port}`
          : parsed.target.hostname;
      if (host.value.trim().toLowerCase() !== expected.toLowerCase()) {
        issues.push(
          issue(
            "warning",
            "host_mismatch",
            `Host value "${host.value}" differs from URL authority "${expected}".`,
            "headers"
          )
        );
      }
    }
  }

  if ((parsed.version === "2" || parsed.version === "3") && usesHttpWireRules) {
    for (const h of parsed.headers) {
      if (!h.name) continue;
      const lower = h.name.toLowerCase();
      if (CONNECTION_SPECIFIC.has(lower)) {
        issues.push(
          issue(
            "error",
            "connection_specific",
            `HTTP/${parsed.version} forbids connection-specific header "${h.name}". Use framing/stream controls instead.`,
            "headers"
          )
        );
      }
      if (h.name !== h.name.toLowerCase() && !h.name.startsWith(":")) {
        issues.push(
          issue(
            "info",
            "header_case",
            `HTTP/${parsed.version} treats header names as lowercase on the wire ("${h.name}" → "${lower}").`,
            "headers"
          )
        );
      }
    }

    if (hasHeader(parsed.headers, "Host") && !hasHeader(parsed.headers, ":authority")) {
      issues.push(
        issue(
          "info",
          "host_to_authority",
          "In HTTP/2 and HTTP/3, Host maps to the :authority pseudo-header. The encoder will set :authority from the URL (or Host if present).",
          "headers"
        )
      );
    }

    issues.push(
      issue(
        "info",
        "pseudo_headers",
        `HTTP/${parsed.version} uses pseudo-headers :method, :scheme, :path, and :authority instead of a text request line.`,
        "headers"
      )
    );
  }

  const ok = !issues.some((i) => i.severity === "error");
  return { ok, issues };
}
