"use client";

import { useMemo, useState } from "react";
import type { ComposedRequest } from "@/lib/types";
import { toCurl, toFetch, toRawHttp1 } from "@/lib/learn/export";

interface Props {
  request: ComposedRequest;
}

export function ExportBar({ request }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const curl = useMemo(() => {
    try {
      return toCurl(request);
    } catch {
      return "";
    }
  }, [request]);

  const fetchCode = useMemo(() => {
    try {
      return toFetch(request);
    } catch {
      return "";
    }
  }, [request]);

  const raw = useMemo(() => {
    try {
      return toRawHttp1(request);
    } catch {
      return "";
    }
  }, [request]);

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm"
        disabled={!curl}
        onClick={() => copy("curl", curl)}
      >
        {copied === "curl" ? "Copied curl" : "Copy curl"}
      </button>
      <button
        type="button"
        className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm"
        disabled={!fetchCode}
        onClick={() => copy("fetch", fetchCode)}
      >
        {copied === "fetch" ? "Copied fetch" : "Copy fetch"}
      </button>
      <button
        type="button"
        className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm"
        disabled={!raw}
        onClick={() => copy("raw", raw || "")}
      >
        {copied === "raw" ? "Copied raw" : "Copy raw HTTP/1.x"}
      </button>
    </div>
  );
}
