"use client";

import type { ComposedRequest, HttpVersion } from "@/lib/types";
import { METHOD_INFO } from "@/lib/learn/glossary";
import { docsForMethod } from "@/lib/learn/docs";
import { DocLinks } from "./DocLinks";

const VERSIONS: HttpVersion[] = ["1.0", "1.1", "2", "3"];
const METHODS = Object.keys(METHOD_INFO);

interface Props {
  value: ComposedRequest;
  onChange: (next: ComposedRequest) => void;
}

export function RequestEditor({ value, onChange }: Props) {
  const methodInfo = METHOD_INFO[value.method];
  const methodDoc = docsForMethod(value.method);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--muted)]">HTTP version</span>
          <select
            className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            value={value.version}
            onChange={(e) =>
              onChange({ ...value, version: e.target.value as HttpVersion })
            }
          >
            {VERSIONS.map((v) => (
              <option key={v} value={v}>
                HTTP/{v}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--muted)]">Method</span>
          <select
            className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono"
            value={value.method}
            onChange={(e) => onChange({ ...value, method: e.target.value })}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--muted)]">URL</span>
          <input
            className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono text-sm"
            value={value.url}
            onChange={(e) => onChange({ ...value, url: e.target.value })}
            placeholder="https://httpbin.org/get"
            spellCheck={false}
          />
        </label>
      </div>

      {methodInfo && (
        <div className="text-sm text-[var(--muted)]">
          <p>
            <strong className="text-[var(--fg)]">{value.method}</strong> —{" "}
            {methodInfo.summary} Safe: {methodInfo.safe ? "yes" : "no"};
            idempotent: {methodInfo.idempotent ? "yes" : "no"}.
          </p>
          {methodDoc && <DocLinks docs={[methodDoc]} />}
        </div>
      )}

      {(value.version === "2" || value.version === "3") && (
        <div className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-3 text-sm leading-relaxed">
          <p className="font-medium text-[var(--fg)]">
            How HTTP/{value.version} differs from HTTP/1.x on the wire
          </p>
          <p className="mt-2 text-[var(--muted)]">
            In HTTP/1.0 and 1.1, the first line of the message is readable text,
            for example:
          </p>
          <pre className="mt-1 overflow-x-auto rounded bg-[var(--code)] p-2 font-mono text-xs">
            {`GET /get?x=1 HTTP/1.1\r\nHost: example.com\r\nAccept: application/json\r\n\r\n`}
          </pre>
          <p className="mt-2 text-[var(--muted)]">
            HTTP/{value.version} does <strong className="text-[var(--fg)]">not</strong>{" "}
            send that text request line. Method, URL pieces, and scheme become{" "}
            <strong className="text-[var(--fg)]">pseudo-headers</strong> (names
            starting with <code>:</code>) inside a compressed header block:
          </p>
          <ul className="mt-2 list-inside list-disc text-[var(--muted)]">
            <li>
              <code>:method</code> — from the Method dropdown (e.g.{" "}
              <code>GET</code>)
            </li>
            <li>
              <code>:scheme</code> — from the URL (
              <code>https</code> or <code>http</code>)
            </li>
            <li>
              <code>:path</code> — path + query only (e.g.{" "}
              <code>/get?x=1</code>), not the full URL
            </li>
            <li>
              <code>:authority</code> — host[:port] from the URL (replaces the
              role of the <code>Host</code> header)
            </li>
          </ul>
          <p className="mt-2 text-[var(--muted)]">
            The lines you type below (<code>Accept:</code>,{" "}
            <code>User-Agent:</code>, …) become the{" "}
            <strong className="text-[var(--fg)]">regular header fields</strong>{" "}
            after those pseudo-headers. Do not put{" "}
            <code>Connection</code>, <code>Transfer-Encoding</code>, or{" "}
            <code>Host</code> here for HTTP/{value.version} — they are forbidden
            or mapped differently (this app sets <code>:authority</code> from the
            URL).
          </p>
          <p className="mt-2 text-[var(--muted)]">
            {value.version === "2" ? (
              <>
                On HTTP/2 those fields are packed into binary{" "}
                <strong className="text-[var(--fg)]">HEADERS frames</strong> and
                compressed with <strong className="text-[var(--fg)]">HPACK</strong>{" "}
                over TLS/TCP. Use <strong>Encode</strong> or{" "}
                <strong>Compare 1.1 vs 2</strong> to see frames and hex.
              </>
            ) : (
              <>
                On HTTP/3 the same logical fields ride in{" "}
                <strong className="text-[var(--fg)]">HTTP/3 HEADERS</strong>{" "}
                frames, compressed with{" "}
                <strong className="text-[var(--fg)]">QPACK</strong>, over{" "}
                <strong className="text-[var(--fg)]">QUIC/UDP</strong> (TLS 1.3
                is inside the QUIC handshake). Use <strong>Encode</strong> or{" "}
                <strong>Compare 2 vs 3</strong> for QPACK vs HPACK.
              </>
            )}
          </p>
          <DocLinks
            docs={
              value.version === "2"
                ? [
                    {
                      label: "RFC 9113 — HTTP/2 pseudo-headers",
                      url: "https://www.rfc-editor.org/rfc/rfc9113#name-request-pseudo-header-fields",
                      source: "RFC",
                    },
                    {
                      label: "MDN: HTTP/2",
                      url: "https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2",
                      source: "MDN",
                    },
                  ]
                : [
                    {
                      label: "RFC 9114 — HTTP/3 HTTP control data",
                      url: "https://www.rfc-editor.org/rfc/rfc9114#name-http-control-data",
                      source: "RFC",
                    },
                    {
                      label: "MDN: HTTP/3",
                      url: "https://developer.mozilla.org/en-US/docs/Glossary/HTTP_3",
                      source: "MDN",
                    },
                  ]
            }
          />
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--muted)]">
          Headers (one per line: Name: value)
        </span>
        <textarea
          className="min-h-[180px] rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono text-sm leading-relaxed"
          value={value.headerText}
          onChange={(e) => onChange({ ...value, headerText: e.target.value })}
          spellCheck={false}
          placeholder={"Host: example.com\nAccept: application/json"}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--muted)]">Body</span>
        <textarea
          className="min-h-[100px] rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono text-sm"
          value={value.body}
          onChange={(e) => onChange({ ...value, body: e.target.value })}
          spellCheck={false}
          placeholder="Optional request body"
        />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value.sendAnyway)}
            onChange={(e) =>
              onChange({ ...value, sendAnyway: e.target.checked })
            }
          />
          Send anyway if validation has errors (for learning)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value.allowPrivateTargets)}
            onChange={(e) =>
              onChange({ ...value, allowPrivateTargets: e.target.checked })
            }
          />
          Allow private / localhost targets (SSRF override)
        </label>
      </div>
    </section>
  );
}
