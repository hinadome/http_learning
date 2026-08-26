"use client";

import { useEffect, useState } from "react";
import type { RewriteRule } from "@/lib/types";
import {
  loadRewriteRules,
  newRewriteRuleId,
  saveRewriteRules,
} from "@/lib/learn/rewrite";

export function RewritePanel() {
  const [rules, setRules] = useState<RewriteRule[]>([]);

  useEffect(() => {
    setRules(loadRewriteRules());
  }, []);

  function persist(next: RewriteRule[]) {
    setRules(next);
    saveRewriteRules(next);
  }

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 text-sm font-semibold">Rewrite rules</h3>
      <p className="mb-2 text-xs text-[var(--muted)]">
        On live Send: inject request headers and/or replace response body
        substring. Applied when path regex matches.
      </p>
      <ul className="max-h-48 space-y-2 overflow-auto text-xs">
        {rules.map((r) => (
          <li key={r.id} className="rounded border border-[var(--border)] p-2">
            <div className="mb-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) =>
                  persist(
                    rules.map((x) =>
                      x.id === r.id ? { ...x, enabled: e.target.checked } : x
                    )
                  )
                }
              />
              <input
                className="min-w-0 flex-1 font-medium"
                value={r.name}
                onChange={(e) =>
                  persist(
                    rules.map((x) =>
                      x.id === r.id ? { ...x, name: e.target.value } : x
                    )
                  )
                }
              />
            </div>
            <input
              className="mb-1 w-full font-mono"
              placeholder="Path regex e.g. /get"
              value={r.pathPattern}
              onChange={(e) =>
                persist(
                  rules.map((x) =>
                    x.id === r.id ? { ...x, pathPattern: e.target.value } : x
                  )
                )
              }
            />
            <textarea
              className="mb-1 w-full font-mono"
              placeholder="Inject request headers (lines)"
              value={r.injectRequestHeaders ?? ""}
              onChange={(e) =>
                persist(
                  rules.map((x) =>
                    x.id === r.id
                      ? { ...x, injectRequestHeaders: e.target.value }
                      : x
                  )
                )
              }
              rows={2}
            />
            <div className="flex gap-1">
              <input
                className="flex-1 font-mono"
                placeholder="Find in body"
                value={r.responseFind ?? ""}
                onChange={(e) =>
                  persist(
                    rules.map((x) =>
                      x.id === r.id ? { ...x, responseFind: e.target.value } : x
                    )
                  )
                }
              />
              <input
                className="flex-1 font-mono"
                placeholder="Replace with"
                value={r.responseReplace ?? ""}
                onChange={(e) =>
                  persist(
                    rules.map((x) =>
                      x.id === r.id
                        ? { ...x, responseReplace: e.target.value }
                        : x
                    )
                  )
                }
              />
            </div>
            <button
              type="button"
              className="mt-1 text-[var(--danger)]"
              onClick={() => persist(rules.filter((x) => x.id !== r.id))}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 text-xs text-[var(--accent)]"
        onClick={() =>
          persist([
            ...rules,
            {
              id: newRewriteRuleId(),
              name: "New rewrite",
              enabled: false,
              pathPattern: "/.*",
            },
          ])
        }
      >
        + Rewrite rule
      </button>
    </aside>
  );
}
