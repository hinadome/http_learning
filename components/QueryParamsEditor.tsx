"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildUrlWithParams,
  newParamId,
  parseQueryParams,
  type QueryParam,
} from "@/lib/url-params";

interface Props {
  url: string;
  onUrlChange: (url: string) => void;
}

export function QueryParamsEditor({ url, onUrlChange }: Props) {
  const [params, setParams] = useState<QueryParam[]>(() =>
    parseQueryParams(url).params
  );
  const baseRef = useRef(parseQueryParams(url).base);
  /** Skip re-parse when URL change came from this editor (avoids new param IDs each keystroke). */
  const pendingOwnUpdate = useRef(false);

  useEffect(() => {
    if (pendingOwnUpdate.current) {
      pendingOwnUpdate.current = false;
      return;
    }
    const parsed = parseQueryParams(url);
    baseRef.current = parsed.base;
    setParams(mergeParamsWithIds(params, parsed.params));
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps -- external url only

  function update(next: QueryParam[]) {
    setParams(next);
    const nextUrl = buildUrlWithParams(baseRef.current, next);
    if (nextUrl !== url) {
      pendingOwnUpdate.current = true;
      onUrlChange(nextUrl);
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-xs text-[var(--muted)]">
        Query parameters are appended to the URL as{" "}
        <code className="text-[var(--fg)]">?key=value</code>. Toggle to
        enable/disable without deleting.
      </p>
      <ul className="flex flex-col gap-1">
        {params.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2">
            <input
              type="checkbox"
              checked={p.enabled}
              onChange={(e) =>
                update(
                  params.map((x) =>
                    x.id === p.id ? { ...x, enabled: e.target.checked } : x
                  )
                )
              }
              title="Enable parameter"
            />
            <input
              className="min-w-[6rem] flex-1 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-mono text-xs"
              value={p.key}
              placeholder="key"
              onChange={(e) =>
                update(
                  params.map((x) =>
                    x.id === p.id ? { ...x, key: e.target.value } : x
                  )
                )
              }
              spellCheck={false}
            />
            <span className="text-[var(--muted)]">=</span>
            <input
              className="min-w-[6rem] flex-[2] rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-mono text-xs"
              value={p.value}
              placeholder="value"
              onChange={(e) =>
                update(
                  params.map((x) =>
                    x.id === p.id ? { ...x, value: e.target.value } : x
                  )
                )
              }
              spellCheck={false}
            />
            <button
              type="button"
              className="text-xs text-[var(--muted)] hover:text-[var(--danger)]"
              onClick={() => update(params.filter((x) => x.id !== p.id))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="self-start rounded border border-[var(--border)] px-2 py-1 text-xs"
        onClick={() =>
          setParams([
            ...params,
            { id: newParamId(), key: "", value: "", enabled: true },
          ])
        }
      >
        + Add parameter
      </button>
    </div>
  );
}

/** Keep stable row ids when re-syncing from URL (presets / import). */
function mergeParamsWithIds(
  current: QueryParam[],
  fromUrl: QueryParam[]
): QueryParam[] {
  const used = new Set<string>();
  const byKey = new Map<string, QueryParam>();
  for (const p of current) {
    if (p.key) byKey.set(p.key, p);
  }

  const merged = fromUrl.map((p) => {
    const prev = byKey.get(p.key);
    if (prev && !used.has(prev.id)) {
      used.add(prev.id);
      return { ...p, id: prev.id };
    }
    return p;
  });

  for (const p of current) {
    if (!p.key.trim() && !merged.some((m) => m.id === p.id)) {
      merged.push(p);
    }
  }

  return merged.length > 0 ? merged : fromUrl;
}
