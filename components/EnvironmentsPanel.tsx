"use client";

import { useState } from "react";
import type { Environment } from "@/lib/types";
import {
  createEmptyVariable,
  saveActiveEnvId,
  saveEnvironments,
} from "@/lib/learn/environments";

interface Props {
  environments: Environment[];
  onChange: (envs: Environment[]) => void;
  activeId: string;
  onActiveId: (id: string) => void;
}

export function EnvironmentsPanel({
  environments,
  onChange,
  activeId,
  onActiveId,
}: Props) {
  const active = environments.find((e) => e.id === activeId) ?? environments[0];

  function updateActive(next: Environment) {
    const envs = environments.map((e) => (e.id === next.id ? next : e));
    onChange(envs);
    saveEnvironments(envs);
  }

  function addEnv() {
    const env: Environment = {
      id: `env-${Date.now()}`,
      name: `Env ${environments.length + 1}`,
      variables: [createEmptyVariable()],
    };
    const next = [...environments, env];
    onChange(next);
    saveEnvironments(next);
    onActiveId(env.id);
    saveActiveEnvId(env.id);
  }

  if (!active) return null;

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Environments</h3>
        <button
          type="button"
          className="text-xs text-[var(--accent)]"
          onClick={addEnv}
        >
          + New
        </button>
      </div>
      <select
        className="mb-3 w-full rounded border border-[var(--border)] bg-[var(--code)] px-2 py-1 text-sm"
        value={activeId}
        onChange={(e) => {
          onActiveId(e.target.value);
          saveActiveEnvId(e.target.value);
        }}
      >
        {environments.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Use <code className="text-[var(--fg)]">{`{{variableName}}`}</code> in
        URL, headers, or body.
      </p>
      <ul className="flex max-h-48 flex-col gap-1 overflow-auto">
        {active.variables.map((v) => (
          <li key={v.id} className="flex gap-1 text-xs">
            <input
              type="checkbox"
              checked={v.enabled}
              onChange={(e) =>
                updateActive({
                  ...active,
                  variables: active.variables.map((x) =>
                    x.id === v.id ? { ...x, enabled: e.target.checked } : x
                  ),
                })
              }
            />
            <input
              className="w-24 rounded border border-[var(--border)] px-1 font-mono"
              value={v.key}
              placeholder="key"
              onChange={(e) =>
                updateActive({
                  ...active,
                  variables: active.variables.map((x) =>
                    x.id === v.id ? { ...x, key: e.target.value } : x
                  ),
                })
              }
            />
            <input
              className="min-w-0 flex-1 rounded border border-[var(--border)] px-1 font-mono"
              value={v.value}
              placeholder="value"
              onChange={(e) =>
                updateActive({
                  ...active,
                  variables: active.variables.map((x) =>
                    x.id === v.id ? { ...x, value: e.target.value } : x
                  ),
                })
              }
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 text-xs text-[var(--muted)]"
        onClick={() =>
          updateActive({
            ...active,
            variables: [...active.variables, createEmptyVariable()],
          })
        }
      >
        + Variable
      </button>
    </aside>
  );
}
