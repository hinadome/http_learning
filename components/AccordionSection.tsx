"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { loadUiPrefs, setAccordionOpen } from "@/lib/learn/ui-prefs";

interface Props {
  id: string;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function AccordionSection({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  useEffect(() => {
    const prefs = loadUiPrefs();
    if (typeof prefs.accordionOpen[id] === "boolean") {
      setOpen(prefs.accordionOpen[id]);
    }
  }, [id]);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      setAccordionOpen(id, next);
      return next;
    });
  }

  return (
    <section className="rounded border border-[var(--border)] bg-[var(--panel)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          {summary && (
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              {summary}
            </span>
          )}
        </span>
        <span className="font-mono text-xs text-[var(--muted)]" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div id={panelId} className="space-y-4 border-t border-[var(--border)] p-4">
          {children}
        </div>
      )}
    </section>
  );
}
