"use client";

import { useMemo, useState } from "react";
import type { ComposedRequest, LearningLog } from "@/lib/types";
import {
  toAxios,
  toCurl,
  toFetch,
  toGoHttp,
  toPythonRequests,
  toRawHttp1,
} from "@/lib/learn/export";
import { toHar } from "@/lib/learn/har";

interface Props {
  request: ComposedRequest;
  log?: LearningLog | null;
}

export function ExportBar({ request, log }: Props) {
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
        har: log ? toHar(log, request) : "",
      };
    } catch {
      return null;
    }
  }, [request, log]);

  async function copy(label: string, text: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  if (!codes) return null;

  const options: Array<[string, string]> = [
    ["curl", codes.curl],
    ["fetch", codes.fetch],
    ["python", codes.python],
    ["axios", codes.axios],
    ["go", codes.go],
    ["raw", codes.raw],
  ];
  if (codes.har) options.push(["har", codes.har]);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-[var(--muted)]">Copy as</span>
      <select
        className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 text-sm"
        value=""
        onChange={(e) => {
          const label = e.target.value;
          const pair = options.find(([l]) => l === label);
          if (pair) void copy(pair[0], pair[1]);
          e.target.value = "";
        }}
      >
        <option value="">
          {copied ? `Copied ${copied}` : "Choose format…"}
        </option>
        {options.map(([label]) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
