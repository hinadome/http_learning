"use client";

import type { LifecycleStep } from "@/lib/types";

interface Props {
  steps: LifecycleStep[];
}

export function LifecycleTimeline({ steps }: Props) {
  if (!steps.length) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Lifecycle steps appear after Validate / Encode / Send.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-0">
      {steps.map((step, idx) => (
        <li key={`${step.id}-${idx}`} className="flex gap-3">
          <div className="flex w-6 flex-col items-center">
            <span
              className="mt-1 h-2.5 w-2.5 rounded-full"
              style={{
                background:
                  step.status === "ok"
                    ? "var(--ok)"
                    : step.status === "error"
                      ? "var(--danger)"
                      : step.status === "skip"
                        ? "var(--muted)"
                        : "var(--warn)",
              }}
            />
            {idx < steps.length - 1 && (
              <span className="w-px flex-1 bg-[var(--border)]" />
            )}
          </div>
          <div className="pb-4">
            <div className="font-medium text-sm">{step.label}</div>
            {step.detail && (
              <div className="text-sm text-[var(--muted)]">{step.detail}</div>
            )}
            {step.durationMs != null && (
              <div className="text-xs text-[var(--muted)]">
                {step.durationMs} ms
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
