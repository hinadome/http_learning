"use client";

import { useState } from "react";
import type { ComposedRequest } from "@/lib/types";
import { buildShareUrl } from "@/lib/learn/share";

interface Props {
  request: ComposedRequest;
}

export function ShareButton({ request }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = buildShareUrl(request, window.location.origin);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm"
      onClick={share}
    >
      {copied ? "Link copied" : "Share URL"}
    </button>
  );
}
