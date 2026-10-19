import React, { useState } from "react";
import { isImageAttachment, formatBytes } from "../../lib/files.js";

export default function AttachmentList({
  attachments = [],
  compact = false,
  onDownload,
}) {
  const [downloadingId, setDownloadingId] = useState(null);

  if (!attachments || !attachments.length) return null;

  async function handleDownloadClick(event, att) {
    event.stopPropagation();
    if (downloadingId || !onDownload) return;

    setDownloadingId(att.id);
    try {
      await onDownload(att);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div
      className="attachment-list-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginTop: compact ? 6 : 10,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {attachments.map((a) => {
          const isDownloading = downloadingId === a.id;
          const previewUrl = a.dataUrl || a.url;

          if (isImageAttachment(a) && previewUrl && !onDownload) {
            return (
              <a
                key={a.id}
                href={previewUrl}
                download={a.name}
                title={`Download ${a.name}`}
                style={{ display: "block" }}
              >
                <img
                  src={previewUrl}
                  alt={a.name}
                  style={{
                    width: compact ? 52 : 74,
                    height: compact ? 52 : 74,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                  }}
                />
              </a>
            );
          }

          return (
            <div
              key={a.id}
              className={`attachment-card-item${isDownloading ? " downloading" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: compact ? "4px 8px 4px 10px" : "6px 10px 6px 12px",
                fontSize: compact ? 12 : 13,
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 14 }}>
                {isImageAttachment(a) ? "🖼️" : "📄"}
              </span>

              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--text)",
                    maxWidth: 220,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={a.name}
                >
                  {a.name}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 500 }}>
                  {formatBytes(a.size)}
                </span>
              </div>

              {onDownload && (
                <button
                  type="button"
                  className={`btn btn-sm ${isDownloading ? "btn-secondary" : "btn-primary"}`}
                  onClick={(e) => handleDownloadClick(e, a)}
                  disabled={isDownloading}
                  title={`Download ${a.name}`}
                  style={{
                    padding: compact ? "3px 8px" : "4px 10px",
                    fontSize: 11,
                    borderRadius: 7,
                    marginLeft: 4,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    cursor: isDownloading ? "wait" : "pointer",
                  }}
                >
                  {isDownloading ? (
                    <>
                      <span className="confirm-spin" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                      <span>Downloading…</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Download</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {downloadingId && (
        <div
          style={{
            fontSize: 11.5,
            color: "var(--accent)",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            animation: "pulse 1.2s infinite ease-in-out",
          }}
        >
          <span className="confirm-spin" style={{ width: 11, height: 11, borderWidth: 1.5, borderColor: "var(--accent) transparent transparent transparent" }} />
          <span>Preparing file download… please wait a moment.</span>
        </div>
      )}
    </div>
  );
}
