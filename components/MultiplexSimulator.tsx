"use client";

import { useEffect, useState } from "react";

type Mode = "h1" | "h2" | "h3";

const ASSETS = 6;

export function MultiplexSimulator() {
  const [mode, setMode] = useState<Mode>("h1");
  const [running, setRunning] = useState(false);
  const [loaded, setLoaded] = useState<boolean[]>(() =>
    Array(ASSETS).fill(false)
  );

  useEffect(() => {
    if (!running) return;
    setLoaded(Array(ASSETS).fill(false));
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (mode === "h1") {
      for (let conn = 0; conn < ASSETS; conn++) {
        timers.push(
          setTimeout(() => {
            setLoaded((prev) => {
              const next = [...prev];
              next[conn] = true;
              return next;
            });
          }, 400 + conn * 700)
        );
      }
      timers.push(setTimeout(() => setRunning(false), 400 + ASSETS * 700 + 200));
    } else {
      for (let i = 0; i < ASSETS; i++) {
        timers.push(
          setTimeout(() => {
            setLoaded((prev) => {
              const next = [...prev];
              next[i] = true;
              return next;
            });
          }, 300 + i * 120)
        );
      }
      timers.push(setTimeout(() => setRunning(false), 300 + ASSETS * 120 + 400));
    }

    return () => timers.forEach(clearTimeout);
  }, [running, mode]);

  function start() {
    setRunning(true);
  }

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 font-semibold">Multiplex load simulator</h3>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Six assets loading: HTTP/1.1 uses ~6 connections (one asset each,
        serialized); HTTP/2 and HTTP/3 multiplex all streams on one connection.
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
            onClick={() => {
              setMode(id);
              setRunning(false);
              setLoaded(Array(ASSETS).fill(false));
            }}
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
          {running ? "Loading…" : "Simulate load"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {mode === "h1" ? (
          loaded.map((done, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-16 text-[var(--muted)]">conn {i + 1}</span>
              <div className="h-3 flex-1 rounded bg-[var(--code)]">
                <div
                  className="h-full rounded bg-[var(--accent)] transition-all duration-500"
                  style={{ width: done ? "100%" : "0%" }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded border border-[var(--accent-border)] p-2">
            <p className="mb-2 text-xs text-[var(--muted)]">
              One {mode === "h3" ? "QUIC" : "TLS"} connection — parallel streams
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {loaded.map((done, i) => (
                <div
                  key={i}
                  className={`flex h-10 items-center justify-center rounded text-xs font-mono transition-colors duration-300 ${
                    done
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--code)] text-[var(--muted)]"
                  }`}
                >
                  #{i + 1}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
