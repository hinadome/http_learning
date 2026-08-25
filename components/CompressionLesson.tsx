"use client";

const ROWS: Array<{ topic: string; hpack: string; qpack: string }> = [
  {
    topic: "Used by",
    hpack: "HTTP/2 (over TLS/TCP)",
    qpack: "HTTP/3 (over QUIC/UDP)",
  },
  {
    topic: "Table model",
    hpack: "One dynamic table shared on the connection",
    qpack: "Encoder/decoder streams + per-stream references",
  },
  {
    topic: "Head-of-line risk",
    hpack: "A blocked stream can stall header compression for others",
    qpack: "Designed so one stream’s compression state does not block all peers",
  },
  {
    topic: "In this app",
    hpack: "Compare / Encode HTTP/2 → HPACK field hex",
    qpack: "Compare / Encode HTTP/3 → QPACK-style field hex",
  },
];

export function CompressionLesson() {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-1 font-semibold">Lesson: HPACK vs QPACK</h3>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Use <strong>Compare 2 vs 3</strong> with the same headers to see both
        encodings side by side.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted)]">
              <th className="py-1 pr-2 font-medium">Topic</th>
              <th className="py-1 pr-2 font-medium">HPACK</th>
              <th className="py-1 font-medium">QPACK</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.topic} className="border-b border-[var(--border)]/60 align-top">
                <td className="py-2 pr-2 font-medium">{row.topic}</td>
                <td className="py-2 pr-2 text-[var(--muted)]">{row.hpack}</td>
                <td className="py-2 text-[var(--muted)]">{row.qpack}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
