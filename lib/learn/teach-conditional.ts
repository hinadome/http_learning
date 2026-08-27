import type { ComposedRequest, LifecycleStep, SendResponse } from "../types";

/** Fixed Last-Modified for the in-app If-Modified-Since teaching lab (RFC 9110 date compare). */
export const TEACH_IMS_LAST_MODIFIED = "Wed, 21 Oct 2015 07:28:00 GMT";

export const TEACH_IMS_URL = "https://teach.local/if-modified-since";

function headerValue(headerText: string, name: string): string | undefined {
  for (const line of headerText.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    if (line.slice(0, i).trim().toLowerCase() === name.toLowerCase()) {
      return line.slice(i + 1).trim();
    }
  }
  return undefined;
}

function parseHttpDate(value: string): number | null {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/**
 * Educational conditional GET with correct Last-Modified vs If-Modified-Since
 * comparison (unlike httpbin /cache, which 304s if the header is merely present).
 */
export function runTeachIfModifiedSince(req: ComposedRequest): {
  response: SendResponse;
  notes: string[];
  extraSteps: LifecycleStep[];
} {
  const lastModifiedMs = parseHttpDate(TEACH_IMS_LAST_MODIFIED)!;
  const imsRaw = headerValue(req.headerText, "If-Modified-Since");
  const notes: string[] = [
    "Teach lab (local) — not a network request. Compares If-Modified-Since to a fixed Last-Modified.",
    `Resource Last-Modified: ${TEACH_IMS_LAST_MODIFIED}`,
    "httpbin /cache is a bad demo: it returns 304 if If-Modified-Since is present at all, ignoring the date.",
  ];

  const extraSteps: LifecycleStep[] = [
    {
      id: "teach-ims",
      label: "Teach lab: evaluate If-Modified-Since",
      status: "ok",
      detail: imsRaw
        ? `Client If-Modified-Since: ${imsRaw}`
        : "No If-Modified-Since — unconditional GET",
    },
  ];

  const body200 = JSON.stringify(
    {
      lab: "if-modified-since",
      message: "Full representation (200). Resource is newer than If-Modified-Since, or no validator was sent.",
      lastModified: TEACH_IMS_LAST_MODIFIED,
      ifModifiedSince: imsRaw ?? null,
      rule: "If Last-Modified > If-Modified-Since → 200. If Last-Modified ≤ If-Modified-Since → 304.",
    },
    null,
    2
  );

  if (!imsRaw) {
    notes.push("No If-Modified-Since → 200 + Last-Modified (store this for the next conditional GET).");
    return {
      notes,
      extraSteps,
      response: {
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": "application/json",
          "Last-Modified": TEACH_IMS_LAST_MODIFIED,
          "Cache-Control": "max-age=0, must-revalidate",
        },
        body: body200,
        bodyTruncated: false,
        sizeBytes: body200.length,
        httpVersionNegotiated: "HTTP/1.1 (teach)",
      },
    };
  }

  const imsMs = parseHttpDate(imsRaw);
  if (imsMs == null) {
    notes.push(
      `Could not parse If-Modified-Since “${imsRaw}” — treating as unconditional → 200.`
    );
    return {
      notes,
      extraSteps,
      response: {
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": "application/json",
          "Last-Modified": TEACH_IMS_LAST_MODIFIED,
        },
        body: body200,
        bodyTruncated: false,
        sizeBytes: body200.length,
        httpVersionNegotiated: "HTTP/1.1 (teach)",
      },
    };
  }

  // RFC 9110: 304 if the representation has not been modified since the IMS time.
  const notModified = lastModifiedMs <= imsMs;

  if (notModified) {
    notes.push(
      `Last-Modified (${TEACH_IMS_LAST_MODIFIED}) ≤ If-Modified-Since (${imsRaw}) → 304 Not Modified. Keep the cached body.`
    );
    const body = "";
    return {
      notes,
      extraSteps,
      response: {
        status: 304,
        statusText: "Not Modified",
        headers: {
          "Last-Modified": TEACH_IMS_LAST_MODIFIED,
          "Cache-Control": "max-age=0, must-revalidate",
        },
        body,
        bodyTruncated: false,
        sizeBytes: 0,
        httpVersionNegotiated: "HTTP/1.1 (teach)",
      },
    };
  }

  notes.push(
    `Last-Modified (${TEACH_IMS_LAST_MODIFIED}) > If-Modified-Since (${imsRaw}) → 200. Client’s copy is stale; send the new body.`
  );
  return {
    notes,
    extraSteps,
    response: {
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": "application/json",
        "Last-Modified": TEACH_IMS_LAST_MODIFIED,
        "Cache-Control": "max-age=0, must-revalidate",
      },
      body: body200,
      bodyTruncated: false,
      sizeBytes: body200.length,
      httpVersionNegotiated: "HTTP/1.1 (teach)",
    },
  };
}

export function isTeachIfModifiedSince(req: ComposedRequest): boolean {
  if (req.teachLab === "if-modified-since") return true;
  try {
    const u = new URL(req.url);
    return (
      u.hostname === "teach.local" &&
      u.pathname.replace(/\/$/, "") === "/if-modified-since"
    );
  } catch {
    return false;
  }
}
