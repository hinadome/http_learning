"use client";

import { useEffect, useRef, useState } from "react";
import { DocLinks } from "./DocLinks";

type Mode = "h1" | "h2" | "h3";

const ASSETS = 6;
/** Stream that “loses” a packet in the loss demo (0-based). */
const LOSS_STREAM = 2;

type StreamState = {
  progress: number;
  stalled: boolean;
  done: boolean;
};

function emptyStreams(): StreamState[] {
  return Array.from({ length: ASSETS }, () => ({
    progress: 0,
    stalled: false,
    done: false,
  }));
}

export function MultiplexSimulator() {
  const [mode, setMode] = useState<Mode>("h2");
  const [packetLoss, setPacketLoss] = useState(true);
  const [lossSeverity, setLossSeverity] = useState<"light" | "medium" | "heavy">(
    "medium"
  );
  const [running, setRunning] = useState(false);
  const [streams, setStreams] = useState<StreamState[]>(emptyStreams);
  const [phaseNote, setPhaseNote] = useState("");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function schedule(fn: () => void, ms: number) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    if (!running) return;
    clearTimers();
    setStreams(emptyStreams());
    setPhaseNote("Starting…");

    if (mode === "h1") {
      setPhaseNote("HTTP/1.1: ~6 TCP connections — one request finishing at a time per connection.");
      for (let i = 0; i < ASSETS; i++) {
        const start = 200 + i * 650;
        schedule(() => {
          setStreams((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], progress: 50 };
            return next;
          });
        }, start);
        schedule(() => {
          setStreams((prev) => {
            const next = [...prev];
            next[i] = { progress: 100, stalled: false, done: true };
            return next;
          });
        }, start + 500);
      }
      schedule(() => {
        setRunning(false);
        setPhaseNote("Done. HTTP/1.1 parallelism is limited by connection count and per-connection HOL.");
      }, 200 + ASSETS * 650 + 600);
      return;
    }

    // H2 / H3 multiplex — without loss they look similar
    if (!packetLoss) {
      setPhaseNote(
        mode === "h2"
          ? "HTTP/2: many streams on one TCP+TLS connection (no loss simulated)."
          : "HTTP/3: many streams on one QUIC connection (no loss simulated)."
      );
      for (let i = 0; i < ASSETS; i++) {
        schedule(() => {
          setStreams((prev) => {
            const next = [...prev];
            next[i] = { progress: 55, stalled: false, done: false };
            return next;
          });
        }, 200 + i * 80);
        schedule(() => {
          setStreams((prev) => {
            const next = [...prev];
            next[i] = { progress: 100, stalled: false, done: true };
            return next;
          });
        }, 450 + i * 90);
      }
      schedule(() => {
        setRunning(false);
        setPhaseNote(
          "Ideal network: H2 and H3 look alike. Enable “Simulate packet loss” to see transport HOL blocking."
        );
      }, 450 + ASSETS * 90 + 300);
      return;
    }

    // With packet loss — the teaching difference
    const stallMs =
      lossSeverity === "light" ? 600 : lossSeverity === "heavy" ? 2200 : 1100;
    setPhaseNote(
      mode === "h2"
        ? `HTTP/2 over TCP (${lossSeverity} loss): streams share one byte stream — loss stalls the whole connection.`
        : `HTTP/3 over QUIC (${lossSeverity} loss): loss is per-stream — other streams keep progressing.`
    );

    // All streams start progressing in parallel
    for (let i = 0; i < ASSETS; i++) {
      schedule(() => {
        setStreams((prev) => {
          const next = [...prev];
          next[i] = { progress: 35, stalled: false, done: false };
          return next;
        });
      }, 150 + i * 40);
    }

    // Loss event
    schedule(() => {
      if (mode === "h2") {
        setPhaseNote(
          "Packet loss on TCP → retransmission blocks the pipe. All HTTP/2 streams stall (transport HOL)."
        );
        setStreams((prev) =>
          prev.map((s) =>
            s.done ? s : { ...s, stalled: true, progress: Math.max(s.progress, 40) }
          )
        );
      } else {
        setPhaseNote(
          `Packet loss on QUIC stream #${LOSS_STREAM + 1} only — other streams keep finishing.`
        );
        setStreams((prev) =>
          prev.map((s, i) =>
            i === LOSS_STREAM
              ? { ...s, stalled: true, progress: 40 }
              : s
          )
        );
      }
    }, 700);

    if (mode === "h2") {
      // After RTO, everything unblocks and finishes together
      schedule(() => {
        setPhaseNote("TCP recovers — all streams resume together.");
        setStreams((prev) =>
          prev.map((s) => ({ ...s, stalled: false, progress: 70 }))
        );
      }, 700 + stallMs);
      for (let i = 0; i < ASSETS; i++) {
        schedule(() => {
          setStreams((prev) => {
            const next = [...prev];
            next[i] = { progress: 100, stalled: false, done: true };
            return next;
          });
        }, 700 + stallMs + 300 + i * 60);
      }
      schedule(() => {
        setRunning(false);
        setPhaseNote(
          "HTTP/2 lesson: multiplexing helps, but TCP HOL can still freeze every stream. Compare with HTTP/3 + loss."
        );
      }, 700 + stallMs + 300 + ASSETS * 60 + 200);
    } else {
      // H3: non-loss streams finish during the stall
      for (let i = 0; i < ASSETS; i++) {
        if (i === LOSS_STREAM) continue;
        schedule(() => {
          setStreams((prev) => {
            const next = [...prev];
            if (!next[i].done) {
              next[i] = { progress: 100, stalled: false, done: true };
            }
            return next;
          });
        }, 900 + i * 100);
      }
      // Lost stream recovers later
      schedule(() => {
        setPhaseNote(`Stream #${LOSS_STREAM + 1} retransmits independently — others already done.`);
        setStreams((prev) => {
          const next = [...prev];
          next[LOSS_STREAM] = { progress: 70, stalled: false, done: false };
          return next;
        });
      }, 700 + stallMs);
      schedule(() => {
        setStreams((prev) => {
          const next = [...prev];
          next[LOSS_STREAM] = { progress: 100, stalled: false, done: true };
          return next;
        });
      }, 700 + stallMs + 400);
      schedule(() => {
        setRunning(false);
        setPhaseNote(
          "HTTP/3 lesson: QUIC stream independence avoids TCP HOL. Page feels faster under loss even with the same multiplexing."
        );
      }, 700 + stallMs + 600);
    }
  }, [running, mode, packetLoss, lossSeverity]);

  function start() {
    clearTimers();
    setRunning(true);
  }

  function resetMode(next: Mode) {
    clearTimers();
    setMode(next);
    setRunning(false);
    setStreams(emptyStreams());
    setPhaseNote("");
  }

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 font-semibold">Multiplex load simulator</h3>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Without loss, HTTP/2 and HTTP/3 both multiplex streams and look similar.
        With packet loss, HTTP/2 stalls <em>all</em> streams (TCP HOL); HTTP/3
        stalls only the affected stream (QUIC).
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["h1", "HTTP/1.1"],
            ["h2", "HTTP/2"],
            ["h3", "HTTP/3"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded px-2 py-1 text-xs ${
              mode === id
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)]"
            }`}
            onClick={() => resetMode(id)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="rounded bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent)]"
          disabled={running}
          onClick={start}
        >
          {running ? "Running…" : "Simulate load"}
        </button>
      </div>

      {(mode === "h2" || mode === "h3") && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={packetLoss}
              disabled={running}
              onChange={(e) => {
                setPacketLoss(e.target.checked);
                setStreams(emptyStreams());
                setPhaseNote("");
              }}
            />
            Simulate packet loss (shows H2 vs H3 difference)
          </label>
          {packetLoss && (
            <label className="flex items-center gap-1">
              Severity
              <select
                className="rounded border border-[var(--border)] px-1 py-0.5"
                disabled={running}
                value={lossSeverity}
                onChange={(e) =>
                  setLossSeverity(e.target.value as "light" | "medium" | "heavy")
                }
              >
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </select>
            </label>
          )}
        </div>
      )}

      {phaseNote && (
        <p className="mb-3 rounded border border-[var(--border)] bg-[var(--code)] px-2 py-1.5 text-xs text-[var(--muted)]">
          {phaseNote}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {mode === "h1" ? (
          streams.map((s, i) => (
            <StreamBar
              key={i}
              label={`conn ${i + 1}`}
              state={s}
            />
          ))
        ) : (
          <div className="rounded border border-[var(--accent-border)] p-2">
            <p className="mb-2 text-xs text-[var(--muted)]">
              One {mode === "h3" ? "QUIC" : "TCP + TLS"} connection — {ASSETS}{" "}
              streams
              {packetLoss && mode === "h2" && " · shared TCP pipe"}
              {packetLoss && mode === "h3" && " · independent QUIC streams"}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {streams.map((s, i) => (
                <StreamTile
                  key={i}
                  index={i}
                  state={s}
                  highlightLoss={packetLoss && i === LOSS_STREAM}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-[10px] text-[var(--muted)] sm:grid-cols-3">
        <p>
          <strong className="text-[var(--fg)]">H1:</strong> few connections,
          sequential per conn
        </p>
        <p>
          <strong className="text-[var(--fg)]">H2:</strong> multiplex on TCP —
          loss can freeze all streams
        </p>
        <p>
          <strong className="text-[var(--fg)]">H3:</strong> multiplex on QUIC —
          loss is stream-local
        </p>
      </div>

      <DocLinks
        className="mt-2"
        docs={[
          {
            label: "RFC 9113 — HTTP/2 streams",
            url: "https://www.rfc-editor.org/rfc/rfc9113#name-streams",
            source: "RFC",
          },
          {
            label: "RFC 9000 — QUIC streams & loss",
            url: "https://www.rfc-editor.org/rfc/rfc9000#name-streams",
            source: "RFC",
          },
          {
            label: "web.dev: HTTP/3",
            url: "https://web.dev/articles/http3",
            source: "web.dev",
          },
        ]}
      />
    </aside>
  );
}

function StreamBar({
  label,
  state,
}: {
  label: string;
  state: StreamState;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-[var(--muted)]">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded bg-[var(--code)]">
        <div
          className={`h-full rounded transition-all duration-300 ${
            state.stalled ? "bg-[var(--warn)]" : "bg-[var(--accent)]"
          }`}
          style={{ width: `${state.progress}%` }}
        />
      </div>
    </div>
  );
}

function StreamTile({
  index,
  state,
  highlightLoss,
}: {
  index: number;
  state: StreamState;
  highlightLoss: boolean;
}) {
  const tone = state.stalled
    ? "border-[var(--warn)] bg-[var(--warn-soft)] text-[var(--warn)]"
    : state.done
      ? "border-transparent bg-[var(--accent)] text-white"
      : "border-[var(--border)] bg-[var(--code)] text-[var(--muted)]";

  return (
    <div
      className={`rounded border p-2 font-mono text-xs transition-colors duration-300 ${tone}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span>#{index + 1}</span>
        <span className="text-[10px]">
          {state.stalled ? "stalled" : state.done ? "done" : `${state.progress}%`}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-black/10">
        <div
          className={`h-full transition-all duration-300 ${
            state.stalled ? "bg-[var(--warn)]" : "bg-[var(--accent)]"
          }`}
          style={{
            width: `${state.progress}%`,
            background: state.done && !state.stalled ? "white" : undefined,
          }}
        />
      </div>
      {highlightLoss && (
        <p className="mt-1 text-[9px] opacity-80">loss target</p>
      )}
    </div>
  );
}
