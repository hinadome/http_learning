"use client";

import type { UiMode } from "@/lib/learn/ui-prefs";

interface Props {
  mode: UiMode;
  onChange: (mode: UiMode) => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--panel)] p-0.5 text-sm"
      role="group"
      aria-label="UI mode"
    >
      <button
        type="button"
        className={`rounded-md px-3 py-1.5 transition-colors ${
          mode === "lab"
            ? "bg-[var(--accent)] font-medium text-white"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
        aria-pressed={mode === "lab"}
        onClick={() => onChange("lab")}
      >
        Lab
      </button>
      <button
        type="button"
        className={`rounded-md px-3 py-1.5 transition-colors ${
          mode === "workspace"
            ? "bg-[var(--accent)] font-medium text-white"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
        aria-pressed={mode === "workspace"}
        onClick={() => onChange("workspace")}
      >
        Workspace
      </button>
    </div>
  );
}
