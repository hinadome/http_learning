"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BreakpointPending,
  CollectionEntry,
  ComposedRequest,
  CompareEncodeResult,
  ComparePair,
  EncodeResult,
  Environment,
  LearningLog,
  TrafficEntry,
  ValidationResult,
  HistoryItem,
} from "@/lib/types";
import { loadHistory, pushHistory, clearHistory } from "@/lib/learn/history";
import {
  getActiveEnvironment,
  loadActiveEnvId,
  loadEnvironments,
  saveEnvironments,
} from "@/lib/learn/environments";
import { applyEnvironment, envToMap } from "@/lib/env/substitute";
import { loadMockRules } from "@/lib/learn/mock";
import {
  applyRewriteToRequest,
  loadRewriteRules,
} from "@/lib/learn/rewrite";
import {
  loadTrafficSession,
  newTrafficId,
  pushTrafficEntry,
} from "@/lib/learn/traffic-log";
import { saveCollections, loadCollections } from "@/lib/learn/collections";
import { parseShareFromHash } from "@/lib/learn/share";
import { prepareRequestForSend } from "@/lib/request/prepare";
import {
  cookieHeaderForUrl,
  ingestSetCookieHeaders,
  upsertCookieHeader,
} from "@/lib/learn/cookie-jar";
import { loadUiPrefs, saveUiPrefs, setUiMode, type UiMode } from "@/lib/learn/ui-prefs";
import {
  DEFAULT_REQUEST,
  mergePresetRequest,
} from "@/lib/learn/default-request";
import { RequestEditor } from "@/components/RequestEditor";
import { ValidationPanel } from "@/components/ValidationPanel";
import { LearningLogView } from "@/components/LearningLog";
import { ExportBar } from "@/components/ExportBar";
import { EnvironmentsPanel } from "@/components/EnvironmentsPanel";
import { CollectionsPanel } from "@/components/CollectionsPanel";
import { AssertionsPanel } from "@/components/AssertionsPanel";
import { MockPanel } from "@/components/MockPanel";
import { RewritePanel } from "@/components/RewritePanel";
import { TrafficLogPanel } from "@/components/TrafficLogPanel";
import { BreakpointModal } from "@/components/BreakpointModal";
import { ShareButton } from "@/components/ShareButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LifecycleAnimation } from "@/components/LifecycleAnimation";
import { TlsPanel } from "@/components/TlsPanel";
import { AccordionSection } from "@/components/AccordionSection";
import { PresetSelect } from "@/components/PresetSelect";
import { CookieJarPanel } from "@/components/CookieJarPanel";
import { ModeToggle } from "@/components/ModeToggle";
import { LearnDrawer } from "@/components/LearnDrawer";

const DEFAULT = DEFAULT_REQUEST;

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
  const [traffic, setTraffic] = useState<TrafficEntry[]>([]);
  const [breakpointPending, setBreakpointPending] =
    useState<BreakpointPending | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showSafety, setShowSafety] = useState(false);
  const [jarRevision, setJarRevision] = useState(0);
  const [uiMode, setUiModeState] = useState<UiMode>("lab");
  const [learnOpen, setLearnOpen] = useState(false);

  const resolvedRequest = useMemo(() => {
    const active = getActiveEnvironment(environments);
    const vars = envToMap(active.variables);
    return applyEnvironment(request, vars);
  }, [request, environments, activeEnvId]);

  const loadRequest = useCallback((req: ComposedRequest) => {
    const { request: prepared } = prepareRequestForSend(req);
    return prepared;
  }, []);

  function loadPreset(req: ComposedRequest, presetId?: string) {
    setRequest(mergePresetRequest(req));
    setValidation(null);
    setLog(null);
    setCompare(null);
    setActivePresetId(presetId ?? null);
    if (presetId) {
      const prefs = loadUiPrefs();
      saveUiPrefs({ ...prefs, activePresetId: presetId });
    }
  }

  useEffect(() => {
    setHistory(loadHistory());
    setEnvironments(loadEnvironments());
    setActiveEnvId(loadActiveEnvId());
    setTraffic(loadTrafficSession());
    const prefs = loadUiPrefs();
    if (prefs.activePresetId) setActivePresetId(prefs.activePresetId);
    if (prefs.uiMode === "lab" || prefs.uiMode === "workspace") {
      setUiModeState(prefs.uiMode);
    }
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

  function preparePayload(req: ComposedRequest) {
    const prepared = loadRequest(req);
    return applyRewriteToRequest(prepared, loadRewriteRules());
  }

  async function validate() {
    setBusy("validate");
    setCompare(null);
    const { request: payload, rule: rewriteRule } = preparePayload(resolvedRequest);
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ValidationResult;
      const issues = [...data.issues];
      if (rewriteRule?.injectRequestHeaders?.trim()) {
        issues.unshift({
          severity: "info",
          code: "rewrite_inject",
          message: `Rewrite rule "${rewriteRule.name}" injects extra header line(s) before validate/send — disable the rule in Rewrite panel if unexpected.`,
          field: "headers",
        });
      }
      const validationResult = {
        ...data,
        issues,
        ok: !issues.some((i) => i.severity === "error"),
      };
      setValidation(validationResult);
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
            status: validationResult.ok ? "ok" : "error",
            detail: `${validationResult.issues.length} issue(s)`,
          },
        ],
        validation: validationResult,
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
        setLearnOpen(true);
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

  async function send(
    breakpointResume?: ComposedRequest["breakpointResume"]
  ) {
    setBusy("send");
    setCompare(null);
    let prepared = loadRequest(resolvedRequest);
    if (request.useCookieJar) {
      const cookie = cookieHeaderForUrl(prepared.url);
      if (cookie) {
        prepared = {
          ...prepared,
          headerText: upsertCookieHeader(prepared.headerText, cookie),
        };
      }
    }
    const payload = {
      ...prepared,
      protocol: request.protocol ?? "http",
      wsOutboundMessage: request.wsOutboundMessage,
      mqttTopic: request.mqttTopic,
      assertions: request.assertions,
      useMock: request.useMock,
      mockRuleId: request.mockRuleId,
      useCookieJar: request.useCookieJar,
      breakpointResume,
    };
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          mockRules: loadMockRules(),
          rewriteRules: loadRewriteRules(),
        }),
      });
      const data = (await res.json()) as LearningLog;
      setLog(data);
      setValidation(data.validation);

      if (data.breakpointPending) {
        setBreakpointPending(data.breakpointPending);
        setTab("lifecycle");
        return;
      }

      setBreakpointPending(null);
      if (request.useCookieJar && data.response) {
        const setCookie =
          data.response.headers["set-cookie"] ??
          data.response.headers["Set-Cookie"];
        ingestSetCookieHeaders(
          setCookie,
          data.finalUrl ?? payload.url
        );
        for (const hop of data.redirectChain ?? []) {
          if (hop.setCookie) {
            ingestSetCookieHeaders(hop.setCookie, hop.url);
          }
        }
        setJarRevision((n) => n + 1);
      }
      setHistory(
        pushHistory(
          request,
          `${request.method} ${request.url} → ${
            data.response?.status ?? data.error ?? "?"
          }`
        )
      );
      setTraffic(
        pushTrafficEntry({
          id: newTrafficId(),
          at: Date.now(),
          method: payload.method,
          url: payload.url,
          status: data.response?.status,
          durationMs: data.timing.totalMs,
          mocked: Boolean(request.useMock),
          rewritten: Boolean(data.rewritten),
          requestHeaders: payload.headerText,
          responsePreview: data.response?.body?.slice(0, 200),
        })
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

  const showH2H3Lesson =
    request.version === "2" ||
    request.version === "3" ||
    compare?.pair === "2-3";

  const isLab = uiMode === "lab";

  function changeUiMode(mode: UiMode) {
    setUiModeState(mode);
    setUiMode(mode);
    if (mode === "lab") {
      setRequest((prev) => {
        const p = prev.protocol ?? "http";
        if (p === "graphql" || p === "sse" || p === "grpc" || p === "mqtt") {
          return {
            ...prev,
            protocol: "http",
            bodyType:
              (prev.bodyType ?? "text") === "graphql" ? "json" : prev.bodyType,
          };
        }
        return prev;
      });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
            Educational lab
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
            HTTP Learning Checker
          </h1>
          <p className="max-w-xl text-sm text-[var(--muted)]">
            {isLab
              ? "Lab mode — compose, validate, send, and inspect results."
              : "Workspace — collections, mocks, rewrites, and session tools."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <ModeToggle mode={uiMode} onChange={changeUiMode} />
            <button
              type="button"
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
              onClick={() => setLearnOpen(true)}
            >
              Learn…
            </button>
            <button
              type="button"
              className="text-xs text-[var(--muted)] underline hover:text-[var(--accent)]"
              onClick={() => setShowSafety((v) => !v)}
            >
              {showSafety ? "Hide safety note" : "Safety note"}
            </button>
            {http3Support && (
              <span className="text-xs text-[var(--muted)]">
                HTTP/3:{" "}
                {http3Support.curlHttp3 || http3Support.currentspace
                  ? "available"
                  : "encode only"}
              </span>
            )}
          </div>
          {showSafety && (
            <p className="mt-2 max-w-xl rounded border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-3 py-2 text-sm">
              Educational client only — not a production API tester. Private
              targets blocked by default. Response bodies capped; requests time
              out.
            </p>
          )}
        </div>
        <ThemeToggle />
      </header>

      {isLab ? (
        <div className="flex flex-wrap items-end gap-3">
          <PresetSelect
            selectedId={activePresetId}
            onSelect={(id, req) => loadPreset(req, id)}
          />
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          Lab presets are hidden here — switch to{" "}
          <button
            type="button"
            className="underline hover:text-[var(--accent)]"
            onClick={() => changeUiMode("lab")}
          >
            Lab
          </button>{" "}
          or open{" "}
          <button
            type="button"
            className="underline hover:text-[var(--accent)]"
            onClick={() => setLearnOpen(true)}
          >
            Learn…
          </button>{" "}
          for curriculum. Load your own requests from Collections below.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <RequestEditor
            value={request}
            onChange={setRequest}
            onImportCollection={mergeOpenApiImport}
            uiMode={uiMode}
          />

          <div className="flex flex-wrap items-center gap-2">
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
            <select
              className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-2 text-sm disabled:opacity-50"
              disabled={Boolean(busy)}
              value=""
              onChange={(e) => {
                const v = e.target.value as ComparePair | "";
                if (v) void encode(v);
                e.target.value = "";
              }}
              aria-label="Compare HTTP versions"
            >
              <option value="">
                {busy?.startsWith("compare") ? "Comparing…" : "Compare…"}
              </option>
              <option value="1.1-2">1.1 vs 2</option>
              <option value="1.1-3">1.1 vs 3</option>
              <option value="2-3">2 vs 3</option>
            </select>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => send()}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy === "send" ? "Sending…" : "Send"}
            </button>
            <ExportBar request={resolvedRequest} log={log} />
            {!isLab && <ShareButton request={request} />}
          </div>

          <ValidationPanel result={validation} />

          {!isLab && (
            <>
              <AccordionSection
                id="client-tools"
                title="Client tools"
                summary="Environments, collections, assertions, history"
              >
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
                      setRequest(mergePresetRequest(req));
                      setValidation(null);
                      setLog(null);
                      setActivePresetId(null);
                    }}
                  />
                </div>
                <AssertionsPanel value={request} onChange={setRequest} />
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
                            onClick={() => {
                              setRequest(mergePresetRequest(h.request));
                              setActivePresetId(null);
                            }}
                          >
                            {h.summary}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionSection>

              <AccordionSection
                id="intercept-tools"
                title="Intercept tools"
                summary="Mock, rewrite, cookie jar, session traffic"
              >
                <MockPanel request={request} onChange={setRequest} />
                <RewritePanel />
                <CookieJarPanel
                  revision={jarRevision}
                  onExportCookieHeader={(line) => {
                    setRequest((prev) => ({
                      ...prev,
                      headerText: upsertCookieHeader(
                        prev.headerText,
                        line.replace(/^Cookie:\s*/i, "")
                      ),
                      useCookieJar: true,
                    }));
                  }}
                  onChange={() => setJarRevision((n) => n + 1)}
                />
                <TrafficLogPanel
                  entries={traffic}
                  onClear={() => setTraffic([])}
                />
              </AccordionSection>
            </>
          )}

          {isLab && (
            <p className="text-xs text-[var(--muted)]">
              Need collections, mocks, or multi-protocol (GraphQL, SSE, gRPC,
              MQTT)? Switch to{" "}
              <button
                type="button"
                className="underline hover:text-[var(--accent)]"
                onClick={() => changeUiMode("workspace")}
              >
                Workspace
              </button>
              . Teaching panels live under{" "}
              <button
                type="button"
                className="underline hover:text-[var(--accent)]"
                onClick={() => setLearnOpen(true)}
              >
                Learn…
              </button>
              .
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <LearningLogView
            log={log}
            compare={compare}
            tab={tab}
            onTab={setTab}
            requestUrl={resolvedRequest.url}
            composedHeaderText={resolvedRequest.headerText}
            useCookieJar={request.useCookieJar}
            onOpenMultiplexLearn={() => setLearnOpen(true)}
          />

          <LifecycleAnimation
            steps={log?.steps ?? []}
            hasResponse={Boolean(log?.response)}
          />

          {log?.tlsInfo && <TlsPanel tls={log.tlsInfo} />}

          {isLab && (
            <p className="text-xs text-[var(--muted)]">
              Curriculum, HTTP/1.1–3 multiplex simulator, and other lessons are in{" "}
              <button
                type="button"
                className="underline hover:text-[var(--accent)]"
                onClick={() => setLearnOpen(true)}
              >
                Learn…
              </button>
              .
            </p>
          )}
        </div>
      </div>

      <LearnDrawer
        open={learnOpen}
        onClose={() => setLearnOpen(false)}
        version={request.version}
        showH2H3={showH2H3Lesson}
        comparePair={compare?.pair ?? null}
        tlsInfo={log?.tlsInfo}
        onLoadPreset={(req, id) => {
          loadPreset(req, id);
          setLearnOpen(false);
          changeUiMode("lab");
        }}
      />

      {breakpointPending && (
        <BreakpointModal
          pending={breakpointPending}
          onResume={(edited) => send(edited)}
          onCancel={() => setBreakpointPending(null)}
        />
      )}
    </main>
  );
}
