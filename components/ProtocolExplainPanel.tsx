"use client";

import type { RequestProtocol } from "@/lib/types";
import { getProtocolHelp } from "@/lib/learn/protocol-help";
import { DocLinks } from "./DocLinks";

interface Props {
  protocol: RequestProtocol | undefined;
}

export function ProtocolExplainPanel({ protocol }: Props) {
  const help = getProtocolHelp(protocol);

  return (
    <div className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-3 text-sm leading-relaxed">
      <p className="font-medium text-[var(--fg)]">{help.title}</p>
      <p className="mt-1 text-[var(--muted)]">{help.summary}</p>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="font-semibold uppercase tracking-wide text-[var(--muted)]">
            On prepare
          </dt>
          <dd className="mt-0.5 text-[var(--foreground)]">{help.prepare}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide text-[var(--muted)]">
            On validate
          </dt>
          <dd className="mt-0.5 text-[var(--foreground)]">{help.validate}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide text-[var(--muted)]">
            On send
          </dt>
          <dd className="mt-0.5 text-[var(--foreground)]">{help.send}</dd>
        </div>
      </dl>
      {help.urlHint && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          URL example: <span className="font-mono">{help.urlHint}</span>
        </p>
      )}
      <div className="mt-2 border-t border-[var(--accent-border)]/50 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Read more
        </p>
        <DocLinks docs={help.docs} />
      </div>
    </div>
  );
}
