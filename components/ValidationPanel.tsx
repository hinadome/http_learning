"use client";

import type { ValidationResult } from "@/lib/types";
import { DocLinks } from "./DocLinks";

interface Props {
  result: ValidationResult | null;
}

const COLORS = {
  error: "var(--danger)",
  warning: "var(--warn)",
  info: "var(--info)",
};

export function ValidationPanel({ result }: Props) {
  if (!result) {
    return (
      <div className="rounded border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
        Click Validate to check required headers for the selected HTTP version.
        Failed checks include links to RFC/MDN so you can verify the rule.
      </div>
    );
  }

  const duplicateIssues = result.issues.filter(
    (i) =>
      i.code === "duplicate_header_http1" || i.code === "duplicate_header_h2h3"
  );

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{
            background: result.ok ? "var(--ok)" : "var(--danger)",
          }}
        />
        <h3 className="font-semibold">
          {result.ok ? "Validation passed" : "Validation failed"}
        </h3>
        <span className="text-sm text-[var(--muted)]">
          {result.issues.length} issue(s)
        </span>
      </div>

      {duplicateIssues.length > 0 && (
        <div className="mb-3 rounded border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-3 py-2 text-sm">
          <p className="font-medium">Duplicate headers detected</p>
          <p className="mt-1 text-[var(--muted)]">
            The same header name appears more than once. On{" "}
            <strong className="text-[var(--foreground)]">HTTP/2 and HTTP/3</strong>, this
            app’s <strong className="text-[var(--foreground)]">Send</strong> keeps only
            the <strong className="text-[var(--foreground)]">last</strong> value. On
            HTTP/1.x both lines may be sent; servers may combine them or pick
            one. Prefer a single line (e.g.{" "}
            <code className="text-xs">Accept: application/json, text/html</code>
            ).
          </p>
        </div>
      )}

      {result.issues.some((i) => i.code === "rewrite_inject") && (
        <div className="mb-3 rounded border border-[var(--info)]/40 bg-[var(--accent-soft)] px-3 py-2 text-sm">
          <p className="font-medium">Rewrite rule active</p>
          <p className="mt-1 text-[var(--muted)]">
            A rewrite rule injected header lines for validate/send. The editor
            shows your typed headers only — disable or fix the rule in the
            Rewrite panel if validation fails on line 4+.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {result.issues.map((issue, i) => (
          <li
            key={`${issue.code}-${i}`}
            className="rounded border border-[var(--border)] px-3 py-2 text-sm"
            style={{
              borderLeftWidth: 3,
              borderLeftColor: COLORS[issue.severity],
            }}
          >
            <div className="font-medium capitalize">{issue.severity}</div>
            <div>{issue.message}</div>
            <div className="mt-1 font-mono text-xs text-[var(--muted)]">
              {issue.code}
              {issue.field ? ` · ${issue.field}` : ""}
            </div>
            <DocLinks docs={issue.docs} />
          </li>
        ))}
        {result.issues.length === 0 && (
          <li className="text-sm text-[var(--muted)]">No issues found.</li>
        )}
      </ul>
    </div>
  );
}
