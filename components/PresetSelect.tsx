"use client";

import { useState } from "react";
import { PRESETS } from "@/lib/learn/presets";
import { getLabGuide } from "@/lib/learn/lab-guides";
import type { ComposedRequest } from "@/lib/types";
import { DocLinks } from "./DocLinks";

interface Props {
  selectedId: string | null;
  onSelect: (presetId: string, request: ComposedRequest) => void;
}

export function PresetSelect({ selectedId, onSelect }: Props) {
  const selected = selectedId
    ? PRESETS.find((p) => p.id === selectedId)
    : undefined;
  const guide = getLabGuide(selectedId);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

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
            if (preset) {
              setChecked({});
              onSelect(preset.id, preset.request);
            }
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
          {guide?.why && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              <strong className="text-[var(--fg)]">Why:</strong> {guide.why}
            </p>
          )}
          {guide?.explain && guide.explain.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-[var(--muted)]">
              {guide.explain.map((line, i) => (
                <li key={i} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          )}
          {guide && guide.steps.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Try this
              </p>
              <ul className="mt-1 flex flex-col gap-1.5">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={Boolean(checked[i])}
                      onChange={(e) =>
                        setChecked((prev) => ({
                          ...prev,
                          [i]: e.target.checked,
                        }))
                      }
                    />
                    <span
                      className={
                        checked[i]
                          ? "text-[var(--muted)] line-through"
                          : "text-[var(--foreground)]"
                      }
                    >
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
              {guide.docs && <DocLinks docs={guide.docs} className="mt-2" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
