"use client";

interface Props {
  composedHeaders: string;
  sentHeaders: Record<string, string>;
  composedBody?: string;
  notes?: string[];
}

/** Highlight differences between editor headers and what Send actually wrote. */
export function ComposedVsSentDiff({
  composedHeaders,
  sentHeaders,
  notes,
}: Props) {
  const composed = parseLines(composedHeaders);
  const sentLower = new Map(
    Object.entries(sentHeaders).map(([k, v]) => [k.toLowerCase(), { name: k, value: v }])
  );

  const composedNames = new Set(composed.map((h) => h.name.toLowerCase()));
  const rows: Array<{
    kind: "same" | "changed" | "added" | "removed";
    label: string;
    detail: string;
  }> = [];

  for (const h of composed) {
    const s = sentLower.get(h.name.toLowerCase());
    if (!s) {
      rows.push({
        kind: "removed",
        label: h.name,
        detail: `In editor (“${h.value.slice(0, 60)}”) but not on wire`,
      });
    } else if (s.value.trim() !== h.value.trim()) {
      rows.push({
        kind: "changed",
        label: h.name,
        detail: `Editor: ${h.value.slice(0, 40)} → Sent: ${s.value.slice(0, 40)}`,
      });
    } else {
      rows.push({
        kind: "same",
        label: h.name,
        detail: s.value.slice(0, 80),
      });
    }
  }

  for (const [lower, s] of sentLower) {
    if (!composedNames.has(lower)) {
      rows.push({
        kind: "added",
        label: s.name,
        detail: `Injected on Send: ${s.value.slice(0, 80)}`,
      });
    }
  }

  const interesting = rows.filter((r) => r.kind !== "same");
  const shown = interesting.length ? interesting : rows.slice(0, 8);

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--panel)] p-3">
      <h4 className="mb-1 text-sm font-semibold">Composed vs Actually sent</h4>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Diff of editor headers against the live Send message (Host inject,
        Cookie jar, rewrite, last-wins duplicates, …).
      </p>
      {notes && notes.length > 0 && (
        <ul className="mb-2 list-inside list-disc text-xs text-[var(--muted)]">
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      <ul className="flex max-h-48 flex-col gap-1 overflow-auto text-xs">
        {shown.map((r, i) => (
          <li
            key={`${r.label}-${i}`}
            className={`rounded border px-2 py-1 font-mono ${
              r.kind === "added"
                ? "border-[var(--ok)]/40 bg-[var(--accent-soft)]"
                : r.kind === "removed"
                  ? "border-[var(--danger)]/40 bg-[var(--danger-soft)]"
                  : r.kind === "changed"
                    ? "border-[var(--warn)]/40 bg-[var(--warn-soft)]"
                    : "border-[var(--border)]"
            }`}
          >
            <span className="uppercase text-[10px] text-[var(--muted)]">
              {r.kind}
            </span>{" "}
            <span className="text-[var(--accent)]">{r.label}</span>
            <div className="text-[var(--muted)]">{r.detail}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseLines(headerText: string): Array<{ name: string; value: string }> {
  const out: Array<{ name: string; value: string }> = [];
  for (const line of headerText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.indexOf(":");
    if (i <= 0) continue;
    out.push({
      name: line.slice(0, i).trim(),
      value: line.slice(i + 1).trim(),
    });
  }
  return out;
}
