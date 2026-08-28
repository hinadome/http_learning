"use client";

import { useEffect, useRef } from "react";
import type { ComparePair, ComposedRequest, HttpVersion, TlsInfo } from "@/lib/types";
import { multiplexSimForCompare } from "@/lib/learn/compare-multiplex";
import { GLOSSARY } from "@/lib/learn/glossary";
import { AccordionSection } from "./AccordionSection";
import { CurriculumPanel } from "./CurriculumPanel";
import { DocsPanel } from "./DocsPanel";
import { DocLinks } from "./DocLinks";
import { CompressionLesson } from "./CompressionLesson";
import { MultiplexLesson } from "./MultiplexLesson";
import { MultiplexSimulator } from "./MultiplexSimulator";
import { StreamPrioritySketch } from "./StreamPrioritySketch";
import { TlsHandshakeTimeline } from "./TlsHandshakeTimeline";
import { CorsTeachingPanel } from "./CorsTeachingPanel";
import { CacheConditionalLesson } from "./CacheConditionalLesson";
import { MitmLesson } from "./MitmLesson";
import { ConnectLesson } from "./ConnectLesson";
import { CaptureGuidePanel } from "./CaptureGuidePanel";

interface Props {
  open: boolean;
  onClose: () => void;
  version: HttpVersion;
  showH2H3: boolean;
  comparePair?: ComparePair | null;
  tlsInfo?: TlsInfo | null;
  onLoadPreset: (request: ComposedRequest, presetId?: string) => void;
}

/** Slide-over for curriculum, docs, and static teaching panels (keeps main grid calm). */
export function LearnDrawer({
  open,
  onClose,
  version,
  showH2H3,
  comparePair,
  tlsInfo,
  onLoadPreset,
}: Props) {
  const multiplexRef = useRef<HTMLDivElement>(null);
  const compareActive = Boolean(comparePair);
  const simPrefs = comparePair ? multiplexSimForCompare(comparePair) : null;

  useEffect(() => {
    if (!open || !comparePair || !multiplexRef.current) return;
    const t = window.setTimeout(() => {
      multiplexRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [open, comparePair]);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="learn-drawer-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close learn panel"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--background)] shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 id="learn-drawer-title" className="text-lg font-semibold">
              Learn
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Curriculum, docs, and teaching panels — off the main results column.
            </p>
          </div>
          <button
            type="button"
            className="rounded border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {compareActive && simPrefs && (
            <div className="rounded border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm">
              <p className="font-medium text-[var(--fg)]">
                Compare → multiplex simulation
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{simPrefs.hint}</p>
            </div>
          )}

          <div ref={multiplexRef}>
            <AccordionSection
              id="multiplex-simulation"
              title="HTTP/1.1–3 multiplexing"
              summary={
                compareActive
                  ? "Pinned — click Simulate load below"
                  : "Animated H1 vs H2 vs H3 load demo + lesson"
              }
              defaultOpen
              pinned={compareActive}
            >
              <MultiplexLesson />
              <MultiplexSimulator
                key={comparePair ?? "default"}
                emphasizeSimulate={compareActive}
                initialMode={simPrefs?.initialMode ?? "h2"}
                initialPacketLoss={simPrefs?.initialPacketLoss ?? true}
              />
            </AccordionSection>
          </div>

          <CurriculumPanel onLoadPreset={onLoadPreset} />
          <DocsPanel version={version} />
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

          {(version === "1.1" ||
            version === "2" ||
            version === "3" ||
            Boolean(tlsInfo)) && (
            <TlsHandshakeTimeline tls={tlsInfo} httpVersion={version} />
          )}

          {showH2H3 && (
            <AccordionSection
              id="h2h3-lessons"
              title="HTTP/2–3 compression & priority"
              summary="HPACK vs QPACK, stream priorities"
              defaultOpen
            >
              <CompressionLesson />
              <StreamPrioritySketch />
            </AccordionSection>
          )}

          <AccordionSection
            id="more-lessons"
            title="More lessons"
            summary="CORS, cache, MITM, CONNECT, capture"
            defaultOpen
          >
            <CorsTeachingPanel />
            <CacheConditionalLesson />
            <MitmLesson />
            <ConnectLesson />
            <CaptureGuidePanel />
          </AccordionSection>
        </div>
      </aside>
    </div>
  );
}
