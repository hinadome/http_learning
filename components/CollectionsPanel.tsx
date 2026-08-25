"use client";

import { useEffect, useState } from "react";
import type { CollectionEntry, CollectionFolder, ComposedRequest } from "@/lib/types";
import {
  addCollectionEntry,
  addFolder,
  deleteCollectionEntry,
  deleteFolder,
  exportCiShellScript,
  exportPostmanCollection,
  loadCollections,
  loadFolders,
  saveCollections,
  saveFolders,
} from "@/lib/learn/collections";

interface Props {
  request: ComposedRequest;
  onLoad: (req: ComposedRequest) => void;
}

export function CollectionsPanel({ request, onLoad }: Props) {
  const [collections, setCollections] = useState<CollectionEntry[]>([]);
  const [folders, setFolders] = useState<CollectionFolder[]>([]);

  useEffect(() => {
    setCollections(loadCollections());
    setFolders(loadFolders());
  }, []);
  const [folderFilter, setFolderFilter] = useState<string>("");
  const [saveName, setSaveName] = useState("");

  function saveCurrent() {
    const name = saveName.trim() || `${request.method} ${request.url}`;
    setCollections(addCollectionEntry(name, request, folderFilter || undefined));
    setSaveName("");
  }

  return (
    <aside className="rounded border border-[var(--border)] bg-[var(--panel)] p-4">
      <h3 className="mb-2 text-sm font-semibold">Collections</h3>
      <div className="mb-2 flex flex-wrap gap-1">
        <input
          className="min-w-0 flex-1 rounded border border-[var(--border)] px-2 py-1 text-xs"
          placeholder="Save as…"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
        />
        <button
          type="button"
          className="rounded border border-[var(--border)] px-2 py-1 text-xs"
          onClick={saveCurrent}
        >
          Save
        </button>
      </div>
      <div className="mb-2 flex gap-1">
        <select
          className="flex-1 rounded border border-[var(--border)] px-2 py-1 text-xs"
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
        >
          <option value="">No folder</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="text-xs text-[var(--accent)]"
          onClick={() => {
            const name = prompt("Folder name");
            if (name?.trim()) setFolders(addFolder(name.trim()));
          }}
        >
          + Folder
        </button>
      </div>
      {collections.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">No saved requests yet.</p>
      ) : (
        <ul className="max-h-40 flex-col gap-1 overflow-auto text-xs">
          {collections.map((c) => (
            <li key={c.id} className="flex gap-1">
              <button
                type="button"
                className="min-w-0 flex-1 truncate rounded border border-[var(--border)] px-2 py-1 text-left hover:border-[var(--accent)]"
                onClick={() => onLoad({ ...c.request })}
                title={c.name}
              >
                {c.name}
              </button>
              <button
                type="button"
                className="text-[var(--muted)] hover:text-[var(--danger)]"
                onClick={() => setCollections(deleteCollectionEntry(c.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {collections.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px]"
            onClick={() =>
              void navigator.clipboard.writeText(
                exportPostmanCollection(collections)
              )
            }
          >
            Copy Postman JSON
          </button>
          <button
            type="button"
            className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px]"
            onClick={() =>
              void navigator.clipboard.writeText(exportCiShellScript(collections))
            }
          >
            Copy CI shell
          </button>
        </div>
      )}
      {folders.length > 0 && (
        <ul className="mt-2 text-[10px] text-[var(--muted)]">
          {folders.map((f) => (
            <li key={f.id} className="flex justify-between">
              <span>{f.name}</span>
              <button
                type="button"
                onClick={() => {
                  const r = deleteFolder(f.id);
                  setFolders(r.folders);
                  setCollections(r.collections);
                }}
              >
                delete folder
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
