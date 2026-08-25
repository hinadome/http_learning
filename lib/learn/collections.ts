import type {
  CollectionEntry,
  CollectionFolder,
  ComposedRequest,
} from "../types";

const COLLECTIONS_KEY = "http-learning-checker-collections";
const FOLDERS_KEY = "http-learning-checker-folders";

export function newCollectionId(): string {
  return `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newFolderId(): string {
  return `fld-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadCollections(): CollectionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(COLLECTIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveCollections(entries: CollectionEntry[]): void {
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(entries));
}

export function loadFolders(): CollectionFolder[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FOLDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveFolders(folders: CollectionFolder[]): void {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

export function addCollectionEntry(
  name: string,
  request: ComposedRequest,
  folderId?: string
): CollectionEntry[] {
  const entries = loadCollections();
  const entry: CollectionEntry = {
    id: newCollectionId(),
    name,
    folderId,
    request: { ...request },
  };
  const next = [entry, ...entries].slice(0, 200);
  saveCollections(next);
  return next;
}

export function deleteCollectionEntry(id: string): CollectionEntry[] {
  const next = loadCollections().filter((e) => e.id !== id);
  saveCollections(next);
  return next;
}

export function addFolder(name: string): CollectionFolder[] {
  const folders = loadFolders();
  const next = [...folders, { id: newFolderId(), name }];
  saveFolders(next);
  return next;
}

export function deleteFolder(id: string): {
  folders: CollectionFolder[];
  collections: CollectionEntry[];
} {
  const folders = loadFolders().filter((f) => f.id !== id);
  const collections = loadCollections().map((c) =>
    c.folderId === id ? { ...c, folderId: undefined } : c
  );
  saveFolders(folders);
  saveCollections(collections);
  return { folders, collections };
}

export function exportPostmanCollection(
  entries: CollectionEntry[],
  name = "HTTP Learning Checker"
): string {
  const items = entries.map((e) => ({
    name: e.name,
    request: {
      method: e.request.method,
      header: e.request.headerText.split("\n").filter(Boolean).map((line) => {
        const i = line.indexOf(":");
        return {
          key: line.slice(0, i).trim(),
          value: line.slice(i + 1).trim(),
        };
      }),
      url: e.request.url,
      body: e.request.body
        ? { mode: "raw", raw: e.request.body }
        : undefined,
    },
  }));
  return JSON.stringify(
    {
      info: {
        name,
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: items,
    },
    null,
    2
  );
}

export function exportCiShellScript(entries: CollectionEntry[]): string {
  const lines = ["#!/usr/bin/env bash", "set -euo pipefail", ""];
  for (const e of entries) {
    lines.push(`# ${e.name}`);
    lines.push(`curl -sS -X ${e.request.method} \\`);
    for (const h of e.request.headerText.split("\n").filter(Boolean)) {
      lines.push(`  -H ${JSON.stringify(h)} \\`);
    }
    if (e.request.body) {
      lines.push(`  --data-binary ${JSON.stringify(e.request.body)} \\`);
    }
    lines.push(`  ${JSON.stringify(e.request.url)}`);
    lines.push(`echo ""`);
    lines.push("");
  }
  return lines.join("\n");
}
