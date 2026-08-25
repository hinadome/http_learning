"use client";

import type { ComposedRequest, RequestAssertion } from "@/lib/types";
import { newAssertionId } from "@/lib/learn/assertions";

interface Props {
  value: ComposedRequest;
  onChange: (next: ComposedRequest) => void;
}

export function AssertionsPanel({ value, onChange }: Props) {
  const assertions = value.assertions ?? [];

  function update(list: RequestAssertion[]) {
    onChange({ ...value, assertions: list });
  }

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-1 text-sm font-semibold">Assertions</h3>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Post-response checks after Send (no JavaScript sandbox). Pre-request:
        use environment variables instead of scripts.
      </p>
      <ul className="flex flex-col gap-2">
        {assertions.map((a) => (
          <li key={a.id} className="flex flex-wrap gap-1 text-xs">
            <select
              className="rounded border border-[var(--border)] px-1"
              value={a.kind}
              onChange={(e) =>
                update(
                  assertions.map((x) =>
                    x.id === a.id
                      ? { ...x, kind: e.target.value as RequestAssertion["kind"] }
                      : x
                  )
                )
              }
            >
              <option value="status">Status</option>
              <option value="header">Header contains</option>
              <option value="body_contains">Body contains</option>
            </select>
            {a.kind === "header" && (
              <input
                className="w-24 rounded border border-[var(--border)] px-1 font-mono"
                placeholder="Header name"
                value={a.target ?? ""}
                onChange={(e) =>
                  update(
                    assertions.map((x) =>
                      x.id === a.id ? { ...x, target: e.target.value } : x
                    )
                  )
                }
              />
            )}
            <input
              className="min-w-0 flex-1 rounded border border-[var(--border)] px-1 font-mono"
              placeholder={a.kind === "status" ? "200" : "expected substring"}
              value={a.expected}
              onChange={(e) =>
                update(
                  assertions.map((x) =>
                    x.id === a.id ? { ...x, expected: e.target.value } : x
                  )
                )
              }
            />
            <button
              type="button"
              className="text-[var(--muted)]"
              onClick={() => update(assertions.filter((x) => x.id !== a.id))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 text-xs text-[var(--accent)]"
        onClick={() =>
          update([
            ...assertions,
            { id: newAssertionId(), kind: "status", expected: "200" },
          ])
        }
      >
        + Assertion
      </button>
    </aside>
  );
}
