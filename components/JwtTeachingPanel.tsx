"use client";

import {
  extractBearerToken,
  jwtExpStatus,
  looksLikeJwt,
  parseJwt,
} from "@/lib/learn/jwt-utils";
import { DocLinks } from "./DocLinks";

interface Props {
  requestHeaderText?: string;
  requestUrl?: string;
  responseStatus?: number;
}

export function JwtTeachingPanel({
  requestHeaderText,
  requestUrl,
  responseStatus,
}: Props) {
  const isTeachLab =
    requestUrl?.includes("teach.local/jwt") ||
    requestUrl?.includes("teach.local%2Fjwt");

  const token = requestHeaderText
    ? extractBearerToken(requestHeaderText)
    : undefined;

  if (!isTeachLab && (!token || !looksLikeJwt(token))) {
    return null;
  }

  const parsed = token ? parseJwt(token) : null;

  return (
    <div className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3">
      <h5 className="mb-2 text-sm font-semibold">JWT Bearer teaching</h5>
      <p className="mb-3 text-xs text-[var(--muted)]">
        On the wire this is still{" "}
        <code className="font-mono">Authorization: Bearer …</code>. A JWT is
        three base64url segments:{" "}
        <strong className="text-[var(--fg)]">header.payload.signature</strong>.
        Servers verify the signature and often reject expired tokens (
        <code className="font-mono">exp</code> claim).
      </p>

      {isTeachLab && (
        <p className="mb-3 text-xs text-[var(--muted)]">
          <code className="font-mono">teach.local/jwt</code> lab — HS256 with a
          fixed teaching secret (not for production).
        </p>
      )}

      {token && looksLikeJwt(token) && (
        <div className="mb-3 rounded border border-[var(--border)] bg-[var(--panel)] p-2 font-mono text-[10px] leading-relaxed break-all">
          <span className="text-[var(--accent)]">{token.split(".")[0]}</span>
          <span className="text-[var(--muted)]">.</span>
          <span className="text-[var(--info)]">{token.split(".")[1]}</span>
          <span className="text-[var(--muted)]">.</span>
          <span className="text-[var(--warn)]">{token.split(".")[2]}</span>
        </div>
      )}

      {parsed ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <JwtPart title="Header (decoded)" data={parsed.header} />
          <JwtPart title="Payload (claims)" data={parsed.payload} highlightExp />
        </div>
      ) : token ? (
        <p className="text-xs text-[var(--danger)]">
          Could not decode JWT — check base64url segments.
        </p>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          Add <code className="font-mono">Authorization: Bearer &lt;jwt&gt;</code>{" "}
          to inspect structure.
        </p>
      )}

      {parsed && (
        <ExpCallout payload={parsed.payload} responseStatus={responseStatus} />
      )}

      <DocLinks
        className="mt-3"
        docs={[
          {
            label: "RFC 7519 — JSON Web Token",
            url: "https://www.rfc-editor.org/rfc/rfc7519",
            source: "RFC",
          },
          {
            label: "RFC 6750 — Bearer token usage",
            url: "https://www.rfc-editor.org/rfc/rfc6750",
            source: "RFC",
          },
          {
            label: "MDN: Authorization",
            url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization",
            source: "MDN",
          },
        ]}
      />
    </div>
  );
}

function JwtPart({
  title,
  data,
  highlightExp,
}: {
  title: string;
  data: Record<string, unknown>;
  highlightExp?: boolean;
}) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--panel)] p-2">
      <p className="mb-1 text-xs font-medium text-[var(--muted)]">{title}</p>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px]">
        {JSON.stringify(data, null, 2)}
      </pre>
      {highlightExp && typeof data.exp === "number" && (
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          <code className="font-mono">exp</code> = {data.exp} (
          {new Date(data.exp * 1000).toUTCString()})
        </p>
      )}
    </div>
  );
}

function ExpCallout({
  payload,
  responseStatus,
}: {
  payload: Record<string, unknown>;
  responseStatus?: number;
}) {
  const { expired, expiresAt } = jwtExpStatus(payload);
  if (typeof payload.exp !== "number") {
    return (
      <p className="mt-3 text-xs text-[var(--muted)]">
        No <code className="font-mono">exp</code> claim — this lab checks exp when
        present; many APIs require it.
      </p>
    );
  }
  if (expired) {
    return (
      <p className="mt-3 rounded border border-[var(--warn)]/50 bg-[var(--warn-soft)] px-2 py-1.5 text-xs">
        <strong className="text-[var(--fg)]">Expired:</strong>{" "}
        <code className="font-mono">exp</code> is in the past (
        {expiresAt}). Valid signature still returns{" "}
        <code className="font-mono">401</code> on the teach lab
        {responseStatus === 401 ? " — matches this response." : "."}
      </p>
    );
  }
  return (
    <p className="mt-3 text-xs text-[var(--muted)]">
      <code className="font-mono">exp</code> is still in the future (
      {expiresAt}) — not expired yet.
    </p>
  );
}
