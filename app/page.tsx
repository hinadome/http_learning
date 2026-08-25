"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CollectionEntry,
  ComposedRequest,
  CompareEncodeResult,
  ComparePair,
  EncodeResult,
  Environment,
  LearningLog,
  ValidationResult,
  HistoryItem,
} from "@/lib/types";
import { PRESETS } from "@/lib/learn/presets";
import { GLOSSARY } from "@/lib/learn/glossary";
import { loadHistory, pushHistory, clearHistory } from "@/lib/learn/history";
import {
  getActiveEnvironment,
  loadActiveEnvId,
  loadEnvironments,
  saveEnvironments,
} from "@/lib/learn/environments";
import { applyEnvironment, envToMap } from "@/lib/env/substitute";
import { loadMockRules } from "@/lib/learn/mock";
import { saveCollections, loadCollections } from "@/lib/learn/collections";
import { parseShareFromHash } from "@/lib/learn/share";
import { prepareRequestForSend } from "@/lib/request/prepare";
import { RequestEditor } from "@/components/RequestEditor";
import { ValidationPanel } from "@/components/ValidationPanel";
import { LearningLogView } from "@/components/LearningLog";
import { ExportBar } from "@/components/ExportBar";
import { DocsPanel } from "@/components/DocsPanel";
import { DocLinks } from "@/components/DocLinks";
import { CompressionLesson } from "@/components/CompressionLesson";
import { MultiplexLesson } from "@/components/MultiplexLesson";
import { EnvironmentsPanel } from "@/components/EnvironmentsPanel";
import { CollectionsPanel } from "@/components/CollectionsPanel";
import { AssertionsPanel } from "@/components/AssertionsPanel";
import { MockPanel } from "@/components/MockPanel";
import { ShareButton } from "@/components/ShareButton";

const DEFAULT: ComposedRequest = {
  version: "1.1",
  method: "GET",
  url: "https://httpbin.org/get",
  headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
  body: "",
  sendAnyway: false,
  allowPrivateTargets: false,
  followRedirects: false,
  maxRedirects: 5,
  protocol: "http",
  bodyType: "text",
  graphqlVariables: "{}",
  multipartFields: [],
  assertions: [],
};

export default function HomePage() {
  const [request, setRequest] = useState<ComposedRequest>(DEFAULT);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [log, setLog] = useState<LearningLog | null>(null);
  const [compare, setCompare] = useState<CompareEncodeResult | null>(null);
  const [tab, setTab] = useState<"lifecycle" | "wire" | "response">("lifecycle");
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState("default");
  const [http3Support, setHttp3Support] = useState<{
    curlHttp3: boolean;
    currentspace: boolean;
  } | null>(null);

  const resolvedRequest = useMemo(() => {
    const active = getActiveEnvironment(environments);
    const vars = envToMap(active.variables);
    return applyEnvironment(request, vars);
  }, [request, environments, activeEnvId]);

  const loadRequest = useCallback((req: ComposedRequest) => {
    const { request: prepared } = prepareRequestForSend(req);
    return prepared;
  }, []);

  useEffect(() => {
    setHistory(loadHistory());
    setEnvironments(loadEnvironments());
    setActiveEnvId(loadActiveEnvId());
    fetch("/api/http3-support")
      .then((r) => r.json())
      .then(setHttp3Support)
      .catch(() => setHttp3Support({ curlHttp3: false, currentspace: false }));

    const shared = parseShareFromHash(window.location.hash);
    if (shared) {
      setRequest(shared);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function validate() {
    setBusy("validate");
    setCompare(null);
    const payload = loadRequest(resolvedRequest);
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ValidationResult;
      setValidation(data);
      setLog({
        steps: [
          {
            id: "compose",
            label: "Compose request (with environment)",
            status: "ok",
            detail: `${payload.method} ${payload.url}`,
          },
          {
            id: "validate",
            label: "Validate headers for HTTP version",
            status: data.ok ? "ok" : "error",
            detail: `${data.issues.length} issue(s)`,
          },
        ],
        validation: data,
        encode: { version: payload.version, frames: [], notes: [] },
        timing: { totalMs: 0 },
      });
      setTab("lifecycle");
    } finally {
      setBusy(null);
    }
  }

  async function encode(comparePair?: ComparePair) {
    setBusy(comparePair ? `compare-${comparePair}` : "encode");
    const payload = loadRequest(resolvedRequest);
    try {
      const res = await fetch("/api/encode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          compare: Boolean(comparePair),
          comparePair,
        }),
      });
      const data = await res.json();
      if (comparePair) {
        const result = data as CompareEncodeResult;
        setCompare(result);
        setLog((prev) => ({
          steps: [
            ...(prev?.steps ?? []),
            {
              id: "compare",
              label: `Compare ${result.leftTitle} vs ${result.rightTitle}`,
              status: "ok",
            },
          ],
          validation: prev?.validation ?? { ok: true, issues: [] },
          encode: result.right,
          timing: { totalMs: 0 },
        }));
      } else {
        setCompare(null);
        setLog({
          steps: [
            {
              id: "compose",
              label: "Compose request (with environment)",
              status: "ok",
            },
            {
              id: "encode",
              label: "Encode wire / frames (no network)",
              status: "ok",
              detail: `${data.frames?.length ?? 0} frame(s)`,
            },
          ],
          validation: validation ?? { ok: true, issues: [] },
          encode: data as EncodeResult,
          timing: { totalMs: 0 },
        });
      }
      setTab("wire");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    setCompare(null);
    const payload = {
      ...loadRequest(resolvedRequest),
      assertions: request.assertions,
      useMock: request.useMock,
      mockRuleId: request.mockRuleId,
    };
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          mockRules: loadMockRules(),
        }),
      });
      const data = (await res.json()) as LearningLog;
      setLog(data);
      setValidation(data.validation);
      setHistory(
        pushHistory(
          request,
          `${request.method} ${request.url} → ${
            data.response?.status ?? data.error ?? "?"
          }`
        )
      );
      setTab(data.response ? "response" : "lifecycle");
    } finally {
      setBusy(null);
    }
  }

  function mergeOpenApiImport(entries: CollectionEntry[]) {
    const existing = loadCollections();
    const merged = [...entries, ...existing].slice(0, 200);
    saveCollections(merged);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
          Educational lab
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight md:text-5xl">
          HTTP Learning Checker
        </h1>
        <p className="max-w-2xl text-[var(--muted)]">
          Compose requests line by line, validate headers by HTTP version, send
          through a controlled proxy, and inspect text wire format or HTTP/2–3
          binary frames — collections, environments, GraphQL, WebSocket, mocks,
          and more.
        </p>
        <p className="rounded border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-3 py-2 text-sm">
          Educational client only — not a production API tester. Private targets
          are blocked by default. Response bodies capped; requests time out.
        </p>
        {http3Support && (
          <p className="text-xs text-[var(--muted)]">
            HTTP/3 live send:{" "}
            {http3Support.curlHttp3 || http3Support.currentspace
              ? "available"
              : "unavailable on this machine (encode view still works)"}
            {http3Support.curlHttp3 ? " · curl HTTP3" : ""}
            {http3Support.currentspace ? " · @currentspace/http3" : ""}
          </p>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.description}
            className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs hover:border-[var(--accent)]"
            onClick={() => {
              setRequest({ ...p.request });
              setValidation(null);
              setLog(null);
              setCompare(null);
            }}
          >
            {p.title}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <RequestEditor
            value={request}
            onChange={setRequest}
            onImportCollection={mergeOpenApiImport}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={validate}
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy === "validate" ? "Validating…" : "Validate"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => encode()}
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy === "encode" ? "Encoding…" : "Encode"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => encode("1.1-2")}
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy === "compare-1.1-2" ? "Comparing…" : "Compare 1.1 vs 2"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => encode("1.1-3")}
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy === "compare-1.1-3" ? "Comparing…" : "Compare 1.1 vs 3"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => encode("2-3")}
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy === "compare-2-3" ? "Comparing…" : "Compare 2 vs 3"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={send}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy === "send" ? "Sending…" : "Send"}
            </button>
            <ShareButton request={request} />
          </div>

          <ExportBar request={resolvedRequest} />
          <DocsPanel version={request.version} />
          <ValidationPanel result={validation} />

          <div className="grid gap-4 sm:grid-cols-2">
            <EnvironmentsPanel
              environments={environments}
              onChange={(envs) => {
                setEnvironments(envs);
                saveEnvironments(envs);
              }}
              activeId={activeEnvId}
              onActiveId={setActiveEnvId}
            />
            <CollectionsPanel
              request={request}
              onLoad={(req) => {
                setRequest(req);
                setValidation(null);
                setLog(null);
              }}
            />
          </div>

          <AssertionsPanel value={request} onChange={setRequest} />
          <MockPanel request={request} onChange={setRequest} />

          {history.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">History</h3>
                <button
                  type="button"
                  className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                  onClick={() => setHistory(clearHistory())}
                >
                  Clear history
                </button>
              </div>
              <ul className="flex max-h-40 flex-col gap-1 overflow-auto text-xs">
                {history.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="w-full rounded border border-[var(--border)] px-2 py-1 text-left hover:border-[var(--accent)]"
                      onClick={() => setRequest({ ...h.request })}
                    >
                      {h.summary}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <LearningLogView
            log={log}
            compare={compare}
            tab={tab}
            onTab={setTab}
            requestUrl={resolvedRequest.url}
          />

          <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
            <h3 className="mb-2 font-semibold">Glossary</h3>
            <dl className="flex flex-col gap-2 text-sm">
              {GLOSSARY.map((g) => (
                <div key={g.term}>
                  <dt className="font-medium">{g.term}</dt>
                  <dd className="text-[var(--muted)]">{g.summary}</dd>
                  {g.docs && <DocLinks docs={g.docs} />}
                </div>
              ))}
            </dl>
          </aside>

          {(request.version === "2" ||
            request.version === "3" ||
            compare?.pair === "2-3") && <CompressionLesson />}

          <MultiplexLesson />
        </div>
      </div>
    </main>
  );
}
