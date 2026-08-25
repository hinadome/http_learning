"use client";

import type { DocRef } from "@/lib/types";

interface Props {
  docs?: DocRef[];
  className?: string;
}

export function DocLinks({ docs, className = "" }: Props) {
  if (!docs?.length) return null;
  return (
    <div className={`mt-1.5 flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
      {docs.map((d) => (
        <a
          key={d.url}
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[var(--accent)] underline decoration-[var(--accent-border)] underline-offset-2 hover:decoration-[var(--accent)]"
        >
          {d.source ? `[${d.source}] ` : ""}
          {d.label}
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      ))}
    </div>
  );
}
