"use client";

import { useState } from "react";
import type { BreakpointPending } from "@/lib/types";

interface Props {
  pending: BreakpointPending;
  onResume: (edited: {
    status: number;
    responseHeaders: string;
    responseBody: string;
  }) => void;
  onCancel: () => void;
}

export function BreakpointModal({ pending, onResume, onCancel }: Props) {
  const [status, setStatus] = useState(pending.status);
  const [responseHeaders, setResponseHeaders] = useState(pending.responseHeaders);
  const [responseBody, setResponseBody] = useState(pending.responseBody);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded border border-[var(--warn)] bg-[var(--panel)] p-4 shadow-lg">
        <h3 className="text-sm font-semibold">Breakpoint — edit response</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Mock rule <strong>{pending.ruleName}</strong> matched. Edit the
          response before it is returned (simulates pausing in-flight traffic).
        </p>
        <label className="mt-3 flex flex-col gap-1 text-xs">
          Status
          <input
            type="number"
            className="rounded border border-[var(--border)] px-2 py-1 font-mono"
            value={status}
            onChange={(e) => setStatus(parseInt(e.target.value, 10) || 200)}
          />
        </label>
        <label className="mt-2 flex flex-col gap-1 text-xs">
          Response headers
          <textarea
            className="min-h-[60px] rounded border border-[var(--border)] px-2 py-1 font-mono"
            value={responseHeaders}
            onChange={(e) => setResponseHeaders(e.target.value)}
          />
        </label>
        <label className="mt-2 flex flex-col gap-1 text-xs">
          Response body
          <textarea
            className="min-h-[120px] rounded border border-[var(--border)] px-2 py-1 font-mono"
            value={responseBody}
            onChange={(e) => setResponseBody(e.target.value)}
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
            onClick={() =>
              onResume({ status, responseHeaders, responseBody })
            }
          >
            Resume
          </button>
          <button
            type="button"
            className="rounded border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
