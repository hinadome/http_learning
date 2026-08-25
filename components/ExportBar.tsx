"use client";

import { useMemo, useState } from "react";
import type { ComposedRequest } from "@/lib/types";
import {
  toAxios,
  toCurl,
  toFetch,
  toGoHttp,
  toPythonRequests,
  toRawHttp1,
} from "@/lib/learn/export";

interface Props {
  request: ComposedRequest;
}

export function ExportBar({ request }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const codes = useMemo(() => {
    try {
      return {
        curl: toCurl(request),
        fetch: toFetch(request),
        raw: toRawHttp1(request),
        python: toPythonRequests(request),
        axios: toAxios(request),
        go: toGoHttp(request),
      };
    } catch {
      return null;
    }
  }, [request]);

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  if (!codes) return null;

  const buttons: Array<[string, string]> = [
    ["curl", codes.curl],
    ["fetch", codes.fetch],
    ["python", codes.python],
    ["axios", codes.axios],
    ["go", codes.go],
    ["raw", codes.raw],
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map(([label, text]) => (
        <button
          key={label}
          type="button"
          className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm"
          disabled={!text}
          onClick={() => copy(label, text)}
        >
          {copied === label ? `Copied ${label}` : `Copy ${label}`}
        </button>
      ))}
    </div>
  );
}
