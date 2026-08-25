"use client";

import type { LifecycleStep } from "@/lib/types";
import { LifecycleTimeline } from "./LifecycleTimeline";
import { QUIC_LESSON_NOTES } from "@/lib/learn/quic-timeline";

interface Props {
  steps?: LifecycleStep[] | null;
}

export function QuicTimelinePanel({ steps }: Props) {
  if (!steps?.length) return null;

  return (
    <div className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)]/50 p-4">
      <h4 className="mb-1 font-semibold">QUIC / TLS 1.3 timeline (educational)</h4>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Conceptual handshake for HTTP/3 — not a raw UDP packet capture.
      </p>
      <LifecycleTimeline steps={steps} />
      <ul className="mt-2 list-inside list-disc text-xs text-[var(--muted)]">
        {QUIC_LESSON_NOTES.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
