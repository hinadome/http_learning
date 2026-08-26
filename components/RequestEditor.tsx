"use client";

import { useState } from "react";
import type { ComposedRequest, HttpVersion, RequestProtocol, BodyType } from "@/lib/types";
import { newMultipartFieldId } from "@/lib/request/prepare";
import { METHOD_INFO } from "@/lib/learn/glossary";
import { docsForMethod } from "@/lib/learn/docs";
import { DocLinks } from "./DocLinks";
import { QueryParamsEditor } from "./QueryParamsEditor";
import { AuthEditor } from "./AuthEditor";
import { ImportPanel } from "./ImportPanel";
import { ProtocolExplainPanel } from "./ProtocolExplainPanel";

const VERSIONS: HttpVersion[] = ["1.0", "1.1", "2", "3"];
const METHODS = Object.keys(METHOD_INFO);

type EditorTab = "main" | "params" | "auth" | "import";

interface Props {
  value: ComposedRequest;
  onChange: (next: ComposedRequest) => void;
  onImportCollection?: (entries: import("@/lib/types").CollectionEntry[]) => void;
}

export function RequestEditor({ value, onChange, onImportCollection }: Props) {
  const [tab, setTab] = useState<EditorTab>("main");
  const methodInfo = METHOD_INFO[value.method];
  const methodDoc = docsForMethod(value.method);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 border-b border-[var(--border)] pb-2">
        {(
          [
            ["main", "Request"],
            ["params", "Params"],
            ["auth", "Auth"],
            ["import", "Import"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded px-3 py-1 text-xs ${
              tab === id
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--panel)] text-[var(--fg)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "params" && (
        <QueryParamsEditor
          url={value.url}
          onUrlChange={(url) => onChange({ ...value, url })}
        />
      )}

      {tab === "auth" && <AuthEditor value={value} onChange={onChange} />}

      {tab === "import" && (
        <ImportPanel
          currentUrl={value.url}
          onImportCollection={onImportCollection}
          onApply={(req) =>
            onChange({
              ...req,
              sendAnyway: value.sendAnyway,
              allowPrivateTargets: value.allowPrivateTargets,
              followRedirects: value.followRedirects,
              maxRedirects: value.maxRedirects,
              protocol: req.protocol ?? value.protocol,
              bodyType: req.bodyType ?? value.bodyType,
            })
          }
        />
      )}

      {tab === "main" && (
        <>
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

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--muted)]">Protocol</span>
              <select
                className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                value={value.protocol ?? "http"}
                onChange={(e) => {
                  const protocol = e.target.value as RequestProtocol;
                  const next: ComposedRequest = { ...value, protocol };
                  if (protocol === "graphql") {
                    next.bodyType = "graphql";
                    next.method = "POST";
                    if (!next.graphqlVariables?.trim()) {
                      next.graphqlVariables = "{}";
                    }
                  } else if (
                    value.protocol === "graphql" &&
                    (value.bodyType ?? "text") === "graphql"
                  ) {
                    next.bodyType = "json";
                  }
                  onChange(next);
                }}
              >
                <option value="http">HTTP / REST</option>
                <option value="graphql">GraphQL</option>
                <option value="websocket">WebSocket</option>
                <option value="sse">SSE</option>
                <option value="grpc">gRPC (gateway)</option>
                <option value="mqtt">MQTT (bridge)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--muted)]">Body type</span>
              <select
                className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                value={value.bodyType ?? "text"}
                onChange={(e) =>
                  onChange({
                    ...value,
                    bodyType: e.target.value as BodyType,
                  })
                }
              >
                <option value="none">None</option>
                <option value="text">Text</option>
                <option value="json">JSON</option>
                <option value="graphql">GraphQL query</option>
                <option value="multipart">Multipart form</option>
              </select>
            </label>
          </div>

          {value.url.includes("cookies/set") && (value.protocol ?? "http") === "http" && (
            <p className="rounded border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-3 py-2 text-xs text-[var(--muted)]">
              <strong className="text-[var(--fg)]">Set-Cookie lab:</strong> use
              the three preset headers only. Keep <strong>Follow redirects</strong>{" "}
              off to see <code className="font-mono">302</code> +{" "}
              <code className="font-mono">Set-Cookie</code> on the Response tab. The
              server <em>responds</em> with Set-Cookie — do not paste cookie lines into
              request headers.
            </p>
          )}

          <ProtocolExplainPanel protocol={value.protocol} />

          {value.protocol === "mqtt" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--muted)]">MQTT topic</span>
              <input
                className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono text-sm"
                value={value.mqttTopic ?? ""}
                onChange={(e) =>
                  onChange({ ...value, mqttTopic: e.target.value })
                }
                placeholder="test/topic"
              />
            </label>
          )}

          {value.protocol === "websocket" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--muted)]">
                WebSocket outbound message
              </span>
              <input
                className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono text-sm"
                value={value.wsOutboundMessage ?? ""}
                onChange={(e) =>
                  onChange({ ...value, wsOutboundMessage: e.target.value })
                }
                placeholder="Hello"
              />
            </label>
          )}

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
                HTTP/{value.version} uses pseudo-headers (
                <code>:method</code>, <code>:scheme</code>, <code>:path</code>,{" "}
                <code>:authority</code>) instead of a text request line. See Encode
                or Compare tabs for frames.
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
                      ]
                    : [
                        {
                          label: "RFC 9114 — HTTP/3",
                          url: "https://www.rfc-editor.org/rfc/rfc9114",
                          source: "RFC",
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
              onChange={(e) =>
                onChange({ ...value, headerText: e.target.value })
              }
              spellCheck={false}
              placeholder={"Host: example.com\nAccept: application/json"}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--muted)]">
              {(value.bodyType ?? "text") === "graphql" || value.protocol === "graphql"
                ? "GraphQL query"
                : "Body"}
            </span>
            <textarea
              className="min-h-[100px] rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono text-sm"
              value={value.body}
              onChange={(e) => onChange({ ...value, body: e.target.value })}
              spellCheck={false}
              placeholder={
                value.protocol === "graphql"
                  ? "{ users { id name } }"
                  : "Optional request body"
              }
            />
          </label>

          {(value.bodyType === "graphql" || value.protocol === "graphql") && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--muted)]">
                GraphQL variables (JSON)
              </span>
              <textarea
                className="min-h-[60px] rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono text-xs"
                value={value.graphqlVariables ?? "{}"}
                onChange={(e) =>
                  onChange({ ...value, graphqlVariables: e.target.value })
                }
                spellCheck={false}
              />
            </label>
          )}

          {value.bodyType === "multipart" && (
            <div className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--muted)]">Form fields</span>
              {(value.multipartFields ?? []).map((f) => (
                <div key={f.id} className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={f.enabled}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        multipartFields: (value.multipartFields ?? []).map((x) =>
                          x.id === f.id ? { ...x, enabled: e.target.checked } : x
                        ),
                      })
                    }
                  />
                  <input
                    className="w-28 rounded border border-[var(--border)] px-2 py-1 font-mono text-xs"
                    value={f.name}
                    placeholder="name"
                    onChange={(e) =>
                      onChange({
                        ...value,
                        multipartFields: (value.multipartFields ?? []).map((x) =>
                          x.id === f.id ? { ...x, name: e.target.value } : x
                        ),
                      })
                    }
                  />
                  <input
                    className="min-w-0 flex-1 rounded border border-[var(--border)] px-2 py-1 font-mono text-xs"
                    value={f.value}
                    placeholder="value"
                    onChange={(e) =>
                      onChange({
                        ...value,
                        multipartFields: (value.multipartFields ?? []).map((x) =>
                          x.id === f.id ? { ...x, value: e.target.value } : x
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                className="self-start text-xs text-[var(--accent)]"
                onClick={() =>
                  onChange({
                    ...value,
                    multipartFields: [
                      ...(value.multipartFields ?? []),
                      {
                        id: newMultipartFieldId(),
                        name: "",
                        value: "",
                        enabled: true,
                      },
                    ],
                  })
                }
              >
                + Field
              </button>
            </div>
          )}

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
            {(value.version === "1.0" || value.version === "1.1") &&
              (value.protocol ?? "http") === "http" && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(value.followRedirects)}
                  onChange={(e) =>
                    onChange({ ...value, followRedirects: e.target.checked })
                  }
                />
                Follow redirects (3xx Location) — shows redirect chain
              </label>
            )}
          </div>
        </>
      )}
    </section>
  );
}
