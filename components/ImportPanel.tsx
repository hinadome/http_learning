"use client";

import { useState } from "react";
import { parseCurlCommand, curlToComposed } from "@/lib/import/curl";
import { parseRawHttpRequest, rawHttpToComposed } from "@/lib/import/raw-http";
import { importOpenApi } from "@/lib/learn/openapi";
import type { ComposedRequest } from "@/lib/types";
import type { CollectionEntry } from "@/lib/types";

interface Props {
  onApply: (req: ComposedRequest) => void;
  onImportCollection?: (entries: CollectionEntry[]) => void;
  currentUrl?: string;
}

export function ImportPanel({ onApply, onImportCollection, currentUrl }: Props) {
  const [mode, setMode] = useState<"raw" | "curl" | "openapi">("raw");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openApiCount, setOpenApiCount] = useState(0);

  function apply() {
    setError(null);
    setOpenApiCount(0);
    if (mode === "raw") {
      const result = parseRawHttpRequest(text, currentUrl);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onApply(rawHttpToComposed(result));
    } else if (mode === "curl") {
      const result = parseCurlCommand(text);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onApply(curlToComposed(result));
    } else {
      const result = importOpenApi(text, currentUrl);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (result.length === 0) {
        setError("No operations imported.");
        return;
      }
      onApply(result[0].request);
      if (onImportCollection) {
        onImportCollection(
          result.map((op) => ({
            id: `col-oa-${op.name}`,
            name: op.name,
            request: op.request,
          }))
        );
      }
      setOpenApiCount(result.length);
    }
    setText("");
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["raw", "Raw HTTP"],
            ["curl", "curl"],
            ["openapi", "OpenAPI"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded px-3 py-1 text-xs ${
              mode === id
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] bg-[var(--panel)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-[var(--muted)]">
        {mode === "raw" &&
          "Paste an HTTP/1.x request: request line, headers, blank line, optional body."}
        {mode === "curl" &&
          "Paste a curl command (-X, -H, -d, -u, --http2/3 supported)."}
        {mode === "openapi" &&
          "Paste OpenAPI 3.x JSON — imports paths into collections and loads the first operation."}
      </p>
      <textarea
        className="min-h-[140px] rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      {error && (
        <p className="rounded border border-[var(--danger)] bg-[var(--danger-soft)] px-2 py-1 text-xs">
          {error}
        </p>
      )}
      {openApiCount > 1 && (
        <p className="text-xs text-[var(--ok)]">
          Imported {openApiCount} operations into collections.
        </p>
      )}
      <button
        type="button"
        onClick={apply}
        disabled={!text.trim()}
        className="self-start rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs disabled:opacity-50"
      >
        Apply to editor
      </button>
    </div>
  );
}
