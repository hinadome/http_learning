"use client";

import type { CompareEncodeResult, EncodeResult, LearningLog } from "@/lib/types";
import { multiplexSimForCompare } from "@/lib/learn/compare-multiplex";
import { QuicTimelinePanel } from "./QuicTimelinePanel";
import { ComposedVsSentDiff } from "./ComposedVsSentDiff";

interface Props {
  encode: EncodeResult | null;
  sent?: LearningLog["sent"] | null;
  composedHeaderText?: string;
  compare?: CompareEncodeResult | null;
  onOpenMultiplexLearn?: () => void;
}

export function BinaryFrameView({
  encode,
  sent,
  compare,
  composedHeaderText,
  onOpenMultiplexLearn,
}: Props) {
  if (compare) {
    const simHint = multiplexSimForCompare(compare.pair);
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-3 text-sm">
          <p className="font-medium">
            Compared {compare.leftTitle} vs {compare.rightTitle}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{simHint.hint}</p>
          {onOpenMultiplexLearn && (
            <button
              type="button"
              className="mt-2 rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
              onClick={onOpenMultiplexLearn}
            >
              Open HTTP/1.1–3 multiplexing → Simulate load
            </button>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <EncodeBlock title={compare.leftTitle} encode={compare.left} />
          <EncodeBlock title={compare.rightTitle} encode={compare.right} />
        </div>
      </div>
    );
  }

  if (!encode && !sent) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Encode or Send to see wire format / binary frames.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sent && <SentBlock sent={sent} />}
      {sent && composedHeaderText != null && (
        <ComposedVsSentDiff
          composedHeaders={composedHeaderText}
          sentHeaders={sent.headersSent}
          notes={sent.notes}
        />
      )}
      {encode?.quicTimeline && encode.quicTimeline.length > 0 && (
        <QuicTimelinePanel steps={encode.quicTimeline} />
      )}
      {encode && (
        <EncodeBlock
          title={
            sent
              ? `Educational encode (HTTP/${encode.version})`
              : `HTTP/${encode.version} encoding`
          }
          encode={encode}
        />
      )}
    </div>
  );
}

function SentBlock({ sent }: { sent: NonNullable<LearningLog["sent"]> }) {
  return (
    <div className="rounded border-2 border-[var(--accent)] bg-[var(--accent-soft)]/40 p-4">
      <h4 className="mb-1 font-semibold">Actually sent</h4>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Reconstructed from the live Send — not just the editor preview.
        {sent.hostPresent === false && sent.protocol !== "HTTP/3" && (
          <>
            {" "}
            <strong className="text-[var(--danger)]">Host was omitted</strong> on
            this request.
          </>
        )}
        {sent.hostPresent === true && (
          <> Host was present on the outbound message.</>
        )}
      </p>

      {(sent.protocol || sent.transport || sent.altSvc || sent.streamId != null) && (
        <dl className="mb-3 grid gap-1 text-sm sm:grid-cols-2">
          {sent.protocol && (
            <>
              <dt className="text-[var(--muted)]">Protocol</dt>
              <dd className="font-mono">{sent.protocol}</dd>
            </>
          )}
          {sent.transport && (
            <>
              <dt className="text-[var(--muted)]">Transport</dt>
              <dd className="font-mono">{sent.transport}</dd>
            </>
          )}
          {sent.streamId != null && (
            <>
              <dt className="text-[var(--muted)]">Stream ID</dt>
              <dd className="font-mono">{sent.streamId}</dd>
            </>
          )}
          {sent.altSvc !== undefined && (
            <>
              <dt className="text-[var(--muted)]">Alt-Svc</dt>
              <dd className="font-mono text-xs break-all">
                {sent.altSvc || "(none observed)"}
              </dd>
            </>
          )}
        </dl>
      )}

      {sent.pseudoHeaders && (
        <>
          <h5 className="mb-1 text-sm font-medium text-[var(--muted)]">
            Pseudo-headers sent
          </h5>
          <pre className="mb-3 overflow-x-auto rounded bg-[var(--code)] p-3 font-mono text-xs">
            {Object.entries(sent.pseudoHeaders)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")}
          </pre>
        </>
      )}

      {sent.quicNotes && sent.quicNotes.length > 0 && (
        <>
          <h5 className="mb-1 text-sm font-medium text-[var(--muted)]">
            QUIC / stream notes
          </h5>
          <ul className="mb-3 list-inside list-disc text-sm text-[var(--muted)]">
            {sent.quicNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}

      <h5 className="mb-1 text-sm font-medium text-[var(--muted)]">
        Equivalent command
      </h5>
      <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded bg-[var(--code)] p-3 font-mono text-xs">
        {sent.curlCommand}
      </pre>

      <h5 className="mb-1 text-sm font-medium text-[var(--muted)]">
        Headers sent
      </h5>
      <pre className="mb-3 overflow-x-auto rounded bg-[var(--code)] p-3 font-mono text-xs">
        {Object.keys(sent.headersSent).length === 0
          ? "(none)"
          : Object.entries(sent.headersSent)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")}
      </pre>

      {sent.wireText && (
        <>
          <h5 className="mb-1 text-sm font-medium text-[var(--muted)]">
            On-wire HTTP/1.x text (CRLF as ⏎)
          </h5>
          <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded bg-[var(--code)] p-3 font-mono text-xs leading-relaxed">
            {sent.wireText.replace(/\r\n/g, "⏎\n")}
          </pre>
          {sent.wireHex && (
            <>
              <h5 className="mb-1 text-sm font-medium text-[var(--muted)]">
                Hex
              </h5>
              <pre className="mb-3 overflow-x-auto rounded bg-[var(--code)] p-3 font-mono text-[10px]">
                {sent.wireHex}
              </pre>
            </>
          )}
        </>
      )}

      {sent.notes.length > 0 && (
        <ul className="list-inside list-disc text-sm text-[var(--muted)]">
          {sent.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EncodeBlock({
  title,
  encode,
}: {
  title: string;
  encode: EncodeResult;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="font-semibold">{title}</h4>

      {encode.pseudoHeaders && (
        <div>
          <h5 className="mb-2 text-sm font-medium text-[var(--muted)]">
            Pseudo-headers
          </h5>
          <pre className="overflow-x-auto rounded bg-[var(--code)] p-3 font-mono text-xs">
            {Object.entries(encode.pseudoHeaders)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")}
          </pre>
        </div>
      )}

      {encode.textWire && (
        <div>
          <h5 className="mb-2 text-sm font-medium text-[var(--muted)]">
            Text wire (CRLF visible as ⏎)
          </h5>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-[var(--code)] p-3 font-mono text-xs leading-relaxed">
            {encode.textWire.replace(/\r\n/g, "⏎\n").replace(/\n$/g, "")}
          </pre>
          {encode.textWireHex && (
            <>
              <h5 className="mb-2 mt-3 text-sm font-medium text-[var(--muted)]">
                Hex
              </h5>
              <pre className="overflow-x-auto rounded bg-[var(--code)] p-3 font-mono text-xs">
                {encode.textWireHex}
              </pre>
            </>
          )}
        </div>
      )}

      {(encode.hpack || encode.qpack) && (
        <div>
          <h5 className="mb-2 text-sm font-medium text-[var(--muted)]">
            {encode.version === "3" ? "QPACK" : "HPACK"} field encoding
          </h5>
          <div className="flex flex-col gap-2">
            {(encode.qpack || encode.hpack)!.map((e, i) => (
              <div
                key={`${e.name}-${i}`}
                className="rounded border border-[var(--border)] p-2 text-xs"
              >
                <div className="font-mono">
                  <span className="text-[var(--accent)]">{e.name}</span>:{" "}
                  {e.value}
                </div>
                <div className="text-[var(--muted)]">
                  {e.encoding}
                  {e.staticIndex != null ? ` · static #${e.staticIndex}` : ""} ·
                  plain {e.plainBytes}B → {e.encodedHex}
                </div>
                <div className="mt-1 text-[var(--muted)]">{e.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h5 className="mb-2 text-sm font-medium text-[var(--muted)]">
          Frames / blocks
        </h5>
        <div className="flex flex-col gap-3">
          {encode.frames.map((frame, i) => (
            <div
              key={`${frame.name}-${i}`}
              className="rounded border border-[var(--border)] p-3"
            >
              <div className="mb-1 flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-sm">{frame.name}</span>
                <span className="rounded bg-[var(--code)] px-1.5 py-0.5 font-mono text-xs">
                  {frame.type}
                </span>
                {frame.streamId != null && (
                  <span className="text-xs text-[var(--muted)]">
                    stream {frame.streamId}
                  </span>
                )}
                {frame.flags && frame.flags.length > 0 && (
                  <span className="text-xs text-[var(--muted)]">
                    {frame.flags.join(", ")}
                  </span>
                )}
              </div>
              <p className="mb-2 text-sm text-[var(--muted)]">
                {frame.explanation}
              </p>
              {frame.annotations.length > 0 && (
                <ul className="mb-2 list-inside list-disc text-xs text-[var(--muted)]">
                  {frame.annotations.map((a, j) => (
                    <li key={j}>
                      +{a.offset}/{a.length}: {a.label}
                      {a.detail ? ` — ${a.detail}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <pre className="overflow-x-auto rounded bg-[var(--code)] p-2 font-mono text-[10px] leading-relaxed">
                {frame.hex}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {encode.notes.length > 0 && (
        <ul className="list-inside list-disc text-sm text-[var(--muted)]">
          {encode.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
