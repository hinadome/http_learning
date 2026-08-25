import type { ComposedRequest } from "../types";
import { parseComposedRequest } from "../parse";

/** Browser-safe HTTP/1.x text message (no Node Buffer). */
export function toRawHttp1(req: ComposedRequest): string {
  const parsed = parseComposedRequest(req);
  const versionToken = req.version === "1.0" ? "HTTP/1.0" : "HTTP/1.1";
  const lines: string[] = [];
  let hasCl = false;
  let hasTe = false;
  for (const h of parsed.headers) {
    if (!h.name) continue;
    lines.push(`${h.name}: ${h.value}`);
    const lower = h.name.toLowerCase();
    if (lower === "content-length") hasCl = true;
    if (lower === "transfer-encoding") hasTe = true;
  }
  if (parsed.body && !hasCl && !hasTe) {
    lines.push(`Content-Length: ${new TextEncoder().encode(parsed.body).length}`);
  }
  return (
    `${parsed.method} ${parsed.pathWithQuery} ${versionToken}\r\n` +
    (lines.length ? lines.join("\r\n") + "\r\n" : "") +
    "\r\n" +
    parsed.body
  );
}

export function toCurl(req: ComposedRequest): string {
  const parsed = parseComposedRequest(req);
  const parts = ["curl"];

  if (req.version === "2") parts.push("--http2");
  if (req.version === "3") parts.push("--http3");

  parts.push("-X", parsed.method);

  for (const h of parsed.headers) {
    if (!h.name) continue;
    parts.push("-H", shellQuote(`${h.name}: ${h.value}`));
  }

  if (parsed.body) {
    parts.push("--data-binary", shellQuote(parsed.body));
  }

  parts.push(shellQuote(parsed.url));
  return parts.join(" ");
}

export function toFetch(req: ComposedRequest): string {
  const parsed = parseComposedRequest(req);
  const headers: Record<string, string> = {};
  for (const h of parsed.headers) {
    if (!h.name) continue;
    headers[h.name] = h.value;
  }

  const init: Record<string, unknown> = {
    method: parsed.method,
    headers,
  };
  if (parsed.body && parsed.method !== "GET" && parsed.method !== "HEAD") {
    init.body = parsed.body;
  }

  return `await fetch(${JSON.stringify(parsed.url)}, ${JSON.stringify(
    init,
    null,
    2
  )});`;
}

export function toAxios(req: ComposedRequest): string {
  const parsed = parseComposedRequest(req);
  const headers: Record<string, string> = {};
  for (const h of parsed.headers) {
    if (!h.name) continue;
    headers[h.name] = h.value;
  }
  const config: Record<string, unknown> = {
    method: parsed.method.toLowerCase(),
    url: parsed.url,
    headers,
  };
  if (parsed.body && parsed.method !== "GET" && parsed.method !== "HEAD") {
    config.data = parsed.body;
  }
  return `import axios from "axios";\n\nconst response = await axios(${JSON.stringify(config, null, 2)});\nconsole.log(response.status, response.data);`;
}

export function toPythonRequests(req: ComposedRequest): string {
  const parsed = parseComposedRequest(req);
  const headers: Record<string, string> = {};
  for (const h of parsed.headers) {
    if (!h.name) continue;
    headers[h.name] = h.value;
  }
  const lines = [
    "import requests",
    "",
    `response = requests.request(`,
    `    ${JSON.stringify(parsed.method)},`,
    `    ${JSON.stringify(parsed.url)},`,
    `    headers=${JSON.stringify(headers, null, 4).replace(/\n/g, "\n    ")},`,
  ];
  if (parsed.body && parsed.method !== "GET" && parsed.method !== "HEAD") {
    lines.push(`    data=${JSON.stringify(parsed.body)},`);
  }
  lines.push(")", "print(response.status_code)", "print(response.text)");
  return lines.join("\n");
}

export function toGoHttp(req: ComposedRequest): string {
  const parsed = parseComposedRequest(req);
  const bodyArg =
    parsed.body && parsed.method !== "GET" && parsed.method !== "HEAD"
      ? `strings.NewReader(${JSON.stringify(parsed.body)})`
      : "nil";
  return `package main

import (
  "fmt"
  "io"
  "net/http"
  "strings"
)

func main() {
  req, _ := http.NewRequest(${JSON.stringify(parsed.method)}, ${JSON.stringify(parsed.url)}, ${bodyArg})
${parsed.headers
  .filter((h) => h.name)
  .map((h) => `  req.Header.Set(${JSON.stringify(h.name)}, ${JSON.stringify(h.value)})`)
  .join("\n")}
  resp, err := http.DefaultClient.Do(req)
  if err != nil { panic(err) }
  defer resp.Body.Close()
  b, _ := io.ReadAll(resp.Body)
  fmt.Println(resp.Status)
  fmt.Println(string(b))
}`;
}

function shellQuote(s: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
