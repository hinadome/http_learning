"use client";

import { useState } from "react";
import type { ComposedRequest, MockRule } from "@/lib/types";
import {
  loadMockRules,
  newMockRuleId,
  saveMockRules,
} from "@/lib/learn/mock";

interface Props {
  request: ComposedRequest;
  onChange: (next: ComposedRequest) => void;
}

export function MockPanel({ request, onChange }: Props) {
  const [rules, setRules] = useState<MockRule[]>(() => loadMockRules());

  function persist(next: MockRule[]) {
    setRules(next);
    saveMockRules(next);
  }

  function addRule() {
    persist([
      ...rules,
      {
        id: newMockRuleId(),
        name: "New mock",
        pathPattern: "/api/.*",
        status: 200,
        responseHeaders: "Content-Type: application/json",
        responseBody: '{"mock": true}',
      },
    ]);
  }

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 text-sm font-semibold">Mock server</h3>
      <label className="mb-2 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={Boolean(request.useMock)}
          onChange={(e) =>
            onChange({ ...request, useMock: e.target.checked })
          }
        />
        Use mock on Send (no network)
      </label>
      {request.useMock && (
        <select
          className="mb-2 w-full rounded border border-[var(--border)] px-2 py-1 text-xs"
          value={request.mockRuleId ?? ""}
          onChange={(e) =>
            onChange({
              ...request,
              mockRuleId: e.target.value || undefined,
            })
          }
        >
          <option value="">Auto-match by path regex</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}
      <ul className="max-h-36 space-y-2 overflow-auto text-xs">
        {rules.map((r) => (
          <li key={r.id} className="rounded border border-[var(--border)] p-2">
            <input
              className="mb-1 w-full font-medium"
              value={r.name}
              onChange={(e) =>
                persist(
                  rules.map((x) =>
                    x.id === r.id ? { ...x, name: e.target.value } : x
                  )
                )
              }
            />
            <input
              className="mb-1 w-full font-mono"
              placeholder="Path regex"
              value={r.pathPattern}
              onChange={(e) =>
                persist(
                  rules.map((x) =>
                    x.id === r.id ? { ...x, pathPattern: e.target.value } : x
                  )
                )
              }
            />
            <div className="flex gap-1">
              <input
                type="number"
                className="w-16 rounded border border-[var(--border)] px-1"
                value={r.status}
                onChange={(e) =>
                  persist(
                    rules.map((x) =>
                      x.id === r.id
                        ? { ...x, status: parseInt(e.target.value, 10) || 200 }
                        : x
                    )
                  )
                }
              />
              <button
                type="button"
                className="text-[var(--danger)]"
                onClick={() => persist(rules.filter((x) => x.id !== r.id))}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-2 text-xs text-[var(--accent)]" onClick={addRule}>
        + Mock rule
      </button>
    </aside>
  );
}
