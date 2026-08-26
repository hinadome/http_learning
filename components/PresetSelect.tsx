"use client";

import { PRESETS } from "@/lib/learn/presets";
import type { ComposedRequest } from "@/lib/types";

interface Props {
  selectedId: string | null;
  onSelect: (presetId: string, request: ComposedRequest) => void;
}

export function PresetSelect({ selectedId, onSelect }: Props) {
  const selected = selectedId
    ? PRESETS.find((p) => p.id === selectedId)
    : undefined;

  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--muted)]">Lab / preset</span>
        <select
          className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
          value={selectedId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) return;
            const preset = PRESETS.find((p) => p.id === id);
            if (preset) onSelect(preset.id, preset.request);
          }}
        >
          <option value="">Choose a preset…</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <div className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-2 text-sm">
          <p className="font-medium text-[var(--fg)]">{selected.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            {selected.description}
          </p>
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Tip: Validate → Encode → Send to walk through this lab. Use the
            Response / Wire tabs for teaching panels.
          </p>
        </div>
      )}
    </div>
  );
}
