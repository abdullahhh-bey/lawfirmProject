import React, { useRef, useState } from "react";
import { API_BASE_URL, cases as casesApi } from "../../lib/api.js";
import {
  filesToAttachments,
  formatBytes,
  isImageAttachment,
} from "../../lib/files.js";

// A document tree is a plain array of nodes. Each node is either:
//   { id, kind: 'folder', name, createdAt, children: [...nodes] }
//   { id, kind: 'file', name, mimeType, size, dataUrl, createdAt }
// This component is fully controlled: it never talks to the API directly —
// it just computes the new tree and hands it to onChange, so the same
// component works both for a case that already exists (parent persists via
// casesApi.setDocuments) and for the "New Client / Case" form where the
// case doesn't have an id yet (parent just keeps it in local state until
// the case is created).

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// Returns the children array living at pathIds (a list of folder ids from
// the root). Used for display only.
function getChildrenAt(tree, pathIds) {
  let level = tree;
  for (const id of pathIds) {
    const folder = level.find((n) => n.id === id && n.kind === "folder");
    level = folder?.children || [];
  }
  return level;
}

// Immutably rebuilds `tree`, applying `updateChildren` to the children array
// that lives at pathIds (the root array itself, if pathIds is empty).
function updateAtPath(tree, pathIds, updateChildren) {
  if (pathIds.length === 0) return updateChildren(tree);
  const [head, ...rest] = pathIds;
  return tree.map((node) =>
    node.id === head && node.kind === "folder"
      ? {
          ...node,
          children: updateAtPath(node.children || [], rest, updateChildren),
        }
      : node,
  );
}

export default function DocumentManager({
  documents = [],
  onChange,
  readOnly = false,
  emptyLabel,
  caseId = null,
}) {
  const [path, setPath] = useState([]); // [{ id, name }, ...] from root
  const [menuOpen, setMenuOpen] = useState(false);
  const [err, setErr] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const fileInputRef = useRef(null);

  const safeDocs = Array.isArray(documents) ? documents : [];
  const pathIds = path.map((p) => p.id);
  const children = getChildrenAt(safeDocs, pathIds);
  const folders = children.filter((n) => n.kind === "folder");
  const files = children.filter((n) => n.kind === "file");

  function openFolder(node) {
    setPath((p) => [...p, { id: node.id, name: node.name }]);
  }
  function jumpTo(index) {
    // index === -1 means "Documents" root
    setPath((p) => (index < 0 ? [] : p.slice(0, index + 1)));
  }

  function handleCreateFolder(e) {
    e?.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    const folder = {
      id: genId("fold"),
      kind: "folder",
      name,
      createdAt: new Date().toISOString(),
      children: [],
    };
    const updated = updateAtPath(safeDocs, pathIds, (list) => [
      ...list,
      folder,
    ]);
    onChange?.(updated);
    // Automatically open the new folder so the user can immediately put documents in it
    setPath((p) => [...p, { id: folder.id, name: folder.name }]);
    setFolderName("");
    setNewFolderOpen(false);
  }

  async function handleFiles(e) {
    setMenuOpen(false);
    setErr("");
    try {
      const picked = await filesToAttachments(e.target.files);

      if (caseId) {
        const uploadedNodes = [];
        for (const file of picked) {
          const uploaded = await casesApi.uploadDocument(
            caseId,
            file.rawFile,
            pathIds[pathIds.length - 1] || null,
          );
          uploadedNodes.push({
            id: uploaded.id,
            kind: "file",
            name: uploaded.name,
            mimeType:
              uploaded.mimeType || uploaded.type || "application/octet-stream",
            size: uploaded.size,
            storagePath: uploaded.storagePath,
            createdAt: uploaded.createdAt || new Date().toISOString(),
            ...(uploaded.parentId ? { parentId: uploaded.parentId } : {}),
          });
        }

        onChange?.(
          updateAtPath(safeDocs, pathIds, (list) => [
            ...list,
            ...uploadedNodes,
          ]),
        );
        return;
      }

      const fileNodes = picked.map((a) => ({
        id: a.id,
        kind: "file",
        name: a.name,
        mimeType: a.type,
        size: a.size,
        createdAt: new Date().toISOString(),
      }));
      onChange?.(
        updateAtPath(safeDocs, pathIds, (list) => [...list, ...fileNodes]),
      );
    } catch (ex) {
      setErr(ex.message);
    } finally {
      e.target.value = "";
    }
  }

  async function removeNode(node) {
    const warn =
      node.kind === "folder"
        ? `Remove the folder "${node.name}" and everything inside it?`
        : `Remove "${node.name}"?`;
    if (!window.confirm(warn)) return;

    try {
      if (caseId && node.kind === "file" && node.id) {
        await casesApi.deleteDocument(caseId, node.id);
      }
      onChange?.(
        updateAtPath(safeDocs, pathIds, (list) =>
          list.filter((n) => n.id !== node.id),
        ),
      );
    } catch (ex) {
      setErr(ex.message || "This file could not be removed.");
    }
  }

  async function downloadFile(file, e) {
    e?.stopPropagation();

    if (caseId && file.id && !file.dataUrl && !file.url) {
      const res = await fetch(
        `${API_BASE_URL}/cases/${caseId}/documents/${file.id}/download`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!res.ok) {
        setErr("This file could not be downloaded.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name || "document";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    const targetUrl = file.dataUrl || file.url;
    if (!targetUrl) return;
    const a = document.createElement("a");
    a.href = targetUrl;
    a.download = file.name || "document";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="link"
            onClick={() => jumpTo(-1)}
            style={{
              fontWeight: path.length === 0 ? 700 : 600,
              color: path.length === 0 ? "var(--text)" : "var(--accent)",
            }}
          >
            Documents
          </button>
          {path.map((p, i) => (
            <React.Fragment key={p.id}>
              <span>/</span>
              <button
                type="button"
                className="link"
                onClick={() => jumpTo(i)}
                style={{
                  fontWeight: i === path.length - 1 ? 700 : 600,
                  color:
                    i === path.length - 1 ? "var(--text)" : "var(--accent)",
                }}
              >
                {p.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {!readOnly && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setMenuOpen((o) => !o)}
            >
              + New
            </button>
            {menuOpen && (
              <>
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 9 }}
                />
                <div className="doc-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setNewFolderOpen(true);
                    }}
                  >
                    📁 New Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    ⬆️ Upload Files
                  </button>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFiles}
              style={{ display: "none" }}
            />
          </div>
        )}
      </div>

      {err && (
        <div className="err-text" style={{ marginBottom: 10 }}>
          {err}
        </div>
      )}

      {/* New Folder Modal */}
      {newFolderOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            className="card"
            style={{
              width: 360,
              maxWidth: "90%",
              padding: 20,
              boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
              background: "var(--surface-1)",
            }}
          >
            <h4 style={{ margin: "0 0 4px 0" }}>Create New Folder</h4>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 14,
              }}
            >
              Creating inside:{" "}
              {path.length
                ? `Documents / ${path.map((p) => p.name).join(" / ")}`
                : "Documents"}
            </div>
            <form onSubmit={handleCreateFolder}>
              <input
                type="text"
                placeholder="Folder name (e.g. Evidence, Invoices)"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  marginBottom: 16,
                  fontSize: 13.5,
                }}
              />
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setNewFolderOpen(false);
                    setFolderName("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!folderName.trim()}
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {folders.length === 0 && files.length === 0 && (
        <div className="doc-empty">
          {emptyLabel ||
            (readOnly
              ? "No documents here yet."
              : 'This folder is empty — click "+ New" to add a folder or upload files.')}
        </div>
      )}

      {(folders.length > 0 || files.length > 0) && (
        <div className="doc-grid">
          {folders.map((f) => (
            <div key={f.id} className="doc-item" onClick={() => openFolder(f)}>
              <span className="doc-item-icon">📁</span>
              <div className="doc-item-name">{f.name}</div>
              <div className="doc-item-sub">
                {(f.children || []).length} item
                {(f.children || []).length === 1 ? "" : "s"}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="doc-remove"
                  title="Remove folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(f);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {files.map((f) => (
            <div
              key={f.id}
              className="doc-item"
              title={`${f.name} (Click to download)`}
              onClick={(e) => downloadFile(f, e)}
              style={{ cursor: "pointer" }}
            >
              <span className="doc-item-icon">
                {isImageAttachment({ type: f.mimeType }) ? "🖼️" : "📄"}
              </span>
              <div className="doc-item-name">{f.name}</div>
              <div
                className="doc-item-sub"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{formatBytes(f.size)}</span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--accent)",
                    fontWeight: 600,
                  }}
                >
                  ⬇️ Download
                </span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="doc-remove"
                  title="Remove file"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(f);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
