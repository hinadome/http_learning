"use client";

import type { HttpVersion } from "@/lib/types";
import { VERSION_DOCS } from "@/lib/learn/docs";
import { DocLinks } from "./DocLinks";

interface Props {
  version: HttpVersion;
}

export function DocsPanel({ version }: Props) {
  const docs = VERSION_DOCS[version];

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-1 font-semibold">Docs for HTTP/{version}</h3>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Cross-check validation rules and wire format against the official
        specifications and MDN.
      </p>
      <DocLinks docs={docs} className="mt-0 flex-col items-start gap-2" />
      <p className="mt-3 text-xs text-[var(--muted)]">
        Validation issues also link to the specific RFC/MDN section when
        available.
      </p>
    </aside>
  );
}
