"use client";

import { PRESETS } from "@/lib/learn/presets";
import type { ComposedRequest } from "@/lib/types";

interface Props {
  onLoad: (req: ComposedRequest) => void;
}

export function PresetSelect({ onLoad }: Props) {
  return (
    <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm sm:max-w-md">
      <span className="font-medium text-[var(--muted)]">Lab / preset</span>
      <select
        className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return;
          const preset = PRESETS.find((p) => p.id === id);
          if (preset) onLoad(preset.request);
          e.target.value = "";
        }}
      >
        <option value="">Choose a preset…</option>
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id} title={p.description}>
            {p.title}
          </option>
        ))}
      </select>
    </label>
  );
}
