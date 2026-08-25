"use client";

import { DocLinks } from "./DocLinks";

export function MitmLesson() {
  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 font-semibold">HTTPS MITM (teaching)</h3>
      <p className="text-sm text-[var(--muted)]">
        Tools like HTTP Toolkit and Charles intercept HTTPS by acting as a{" "}
        <strong className="text-[var(--fg)]">transparent proxy</strong> and
        terminating TLS with a <strong className="text-[var(--fg)]">local CA</strong>{" "}
        you install once. The proxy decrypts, lets you inspect or edit, then
        re-encrypts to the real server.
      </p>
      <ul className="mt-2 list-inside list-disc text-xs text-[var(--muted)]">
        <li>This app does not install a system CA or intercept arbitrary browser traffic.</li>
        <li>Use <strong>Session traffic</strong> to review what you Send through the lab.</li>
        <li>Use <strong>Mock + breakpoint</strong> to practice editing responses safely.</li>
        <li>For real MITM learning, see{" "}
          <a href="https://httptoolkit.com/docs/getting-started/" className="text-[var(--accent)] underline" target="_blank" rel="noreferrer">
            HTTP Toolkit docs
          </a>.
        </li>
      </ul>
      <DocLinks
        docs={[
          {
            label: "MDN: HTTP proxying and redirection",
            url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Proxy_servers_and_tunneling",
            source: "MDN",
          },
        ]}
      />
    </aside>
  );
}
