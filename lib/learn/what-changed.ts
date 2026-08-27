import type { LearningLog } from "../types";

export interface ChangeItem {
  id: string;
  label: string;
  detail: string;
}

function headerLines(text: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const name = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    const list = map.get(name) ?? [];
    list.push(value);
    map.set(name, list);
  }
  return map;
}

function hasHeader(text: string, name: string): boolean {
  return headerLines(text).has(name.toLowerCase());
}

/** Summarize educational mutations between composed editor and actual Send. */
export function computeWhatChanged(opts: {
  composedHeaderText: string;
  log: LearningLog;
  useCookieJar?: boolean;
}): ChangeItem[] {
  const { composedHeaderText, log, useCookieJar } = opts;
  const items: ChangeItem[] = [];
  const sent = log.sent;
  const composed = headerLines(composedHeaderText);

  if (log.rewritten) {
    items.push({
      id: "rewrite",
      label: "Rewrite rules",
      detail: "Request and/or response was modified by active rewrite rules.",
    });
  }

  if (useCookieJar) {
    const jarSteps = (log.steps ?? []).filter((s) =>
      s.id.startsWith("cookie-jar")
    );
    if (jarSteps.length) {
      items.push({
        id: "cookie-jar-hops",
        label: "Cookie jar on redirects",
        detail: jarSteps.map((s) => s.detail || s.label).join("; "),
      });
    } else if (sent?.headersSent) {
      const cookieSent =
        sent.headersSent.Cookie ?? sent.headersSent.cookie ?? "";
      const composedCookie = composed.get("cookie")?.[0] ?? "";
      if (cookieSent && cookieSent !== composedCookie) {
        items.push({
          id: "cookie-jar-send",
          label: "Cookie jar injected",
          detail: `Cookie: ${cookieSent.slice(0, 120)}`,
        });
      }
    }
  }

  if (sent) {
    const notes = sent.notes ?? [];
    for (const n of notes) {
      if (/host was not in your editor/i.test(n)) {
        items.push({
          id: "host-auto",
          label: "Host filled",
          detail: n,
        });
      }
      if (/host was intentionally omitted/i.test(n)) {
        items.push({
          id: "host-omit",
          label: "Host omitted",
          detail: n,
        });
      }
    }

    if (sent.headersSent) {
      for (const [name, values] of composed) {
        if (values.length < 2) continue;
        const sentVal =
          sent.headersSent[name] ??
          Object.entries(sent.headersSent).find(
            ([k]) => k.toLowerCase() === name
          )?.[1];
        if (sentVal != null && values[values.length - 1] === sentVal) {
          items.push({
            id: `last-wins-${name}`,
            label: `Last-wins: ${name}`,
            detail: `Editor had ${values.length} ${name} lines; Send kept “${sentVal.slice(0, 80)}”.`,
          });
        }
      }

      if (
        !hasHeader(composedHeaderText, "host") &&
        (sent.headersSent.Host || sent.headersSent.host) &&
        !items.some((i) => i.id === "host-auto")
      ) {
        items.push({
          id: "host-auto",
          label: "Host filled",
          detail: `Sent Host: ${sent.headersSent.Host ?? sent.headersSent.host}`,
        });
      }
    }
  }

  if (log.redirectChain?.length) {
    items.push({
      id: "redirects",
      label: "Redirects followed",
      detail: `${log.redirectChain.length} hop(s)${
        log.finalUrl ? ` → ${log.finalUrl}` : ""
      }`,
    });
  }

  return items;
}
