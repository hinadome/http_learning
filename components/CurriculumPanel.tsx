"use client";

import { useState } from "react";
import { CURRICULA } from "@/lib/learn/curriculum";
import { PRESETS } from "@/lib/learn/presets";
import type { ComposedRequest } from "@/lib/types";

interface Props {
  onLoadPreset: (req: ComposedRequest, presetId?: string) => void;
}

export function CurriculumPanel({ onLoadPreset }: Props) {
  const [activeId, setActiveId] = useState(CURRICULA[0]?.id ?? "");

  const curriculum = CURRICULA.find((c) => c.id === activeId) ?? CURRICULA[0];

  function loadStep(presetId?: string) {
    if (!presetId) return;
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) onLoadPreset({ ...preset.request }, preset.id);
  }

  if (!curriculum) return null;

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 text-sm font-semibold">Learning paths</h3>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Guided curriculum — load presets and follow each step.
      </p>
      <select
        className="mb-3 w-full rounded border border-[var(--border)] px-2 py-1 text-xs"
        value={activeId}
        onChange={(e) => setActiveId(e.target.value)}
      >
        {CURRICULA.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <p className="mb-2 text-xs text-[var(--muted)]">{curriculum.description}</p>
      <ol className="flex flex-col gap-2">
        {curriculum.steps.map((step, i) => (
          <li
            key={i}
            className="rounded border border-[var(--border)] px-2 py-2 text-xs"
          >
            <span className="font-medium">
              {i + 1}. {step.title}
            </span>
            <p className="mt-0.5 text-[var(--muted)]">{step.description}</p>
            {step.presetId && (
              <button
                type="button"
                className="mt-1 text-[var(--accent)] underline"
                onClick={() => loadStep(step.presetId)}
              >
                Load preset
              </button>
            )}
          </li>
        ))}
      </ol>
    </aside>
  );
}
