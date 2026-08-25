"use client";

import type { LifecycleStep } from "@/lib/types";

const PHASES = [
  { id: "compose", label: "Compose" },
  { id: "validate", label: "Validate" },
  { id: "encode", label: "Encode" },
  { id: "connect", label: "Connect" },
  { id: "write", label: "Write" },
  { id: "read", label: "Read" },
  { id: "response", label: "Response" },
];

interface Props {
  steps: LifecycleStep[];
  hasResponse?: boolean;
}

export function LifecycleAnimation({ steps, hasResponse }: Props) {
  const activeIdx = (() => {
    if (hasResponse) return PHASES.length - 1;
    const last = steps[steps.length - 1];
    if (!last) return -1;
    const idx = PHASES.findIndex((p) => p.id === last.id);
    if (idx >= 0) return idx;
    if (last.id.startsWith("redirect")) return PHASES.findIndex((p) => p.id === "read");
    if (last.id === "mock") return PHASES.findIndex((p) => p.id === "read");
    return 0;
  })();

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-3 text-sm font-semibold">Lifecycle animation</h3>
      <div className="flex flex-wrap items-center gap-1">
        {PHASES.map((phase, i) => {
          const done = activeIdx >= 0 && i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={phase.id} className="flex items-center gap-1">
              <div
                className={`rounded px-2 py-1 text-xs font-medium transition-all ${
                  active
                    ? "animate-pulse bg-[var(--accent)] text-white"
                    : done
                      ? "bg-[var(--ok)]/20 text-[var(--ok)]"
                      : "bg-[var(--code)] text-[var(--muted)]"
                }`}
              >
                {phase.label}
              </div>
              {i < PHASES.length - 1 && (
                <span className="text-[var(--muted)]">→</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Highlights the current phase as you Validate, Encode, or Send.
      </p>
    </aside>
  );
}
