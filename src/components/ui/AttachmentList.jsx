import React from "react";
import { isImageAttachment, formatBytes } from "../../lib/files.js";

export default function AttachmentList({
  attachments = [],
  compact = false,
  onDownload,
}) {
  if (!attachments.length) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: compact ? 6 : 10,
      }}
    >
      {attachments.map((a) => {
        const previewUrl = a.dataUrl || a.url;
        if (isImageAttachment(a) && previewUrl) {
          return (
            <a
              key={a.id}
              href={previewUrl}
              download={a.name}
              title={a.name}
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

        const content = (
          <>
            📄 {a.name}{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
              ({formatBytes(a.size)})
            </span>
          </>
        );
        const style = {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          textDecoration: "none",
        };

        return onDownload ? (
          <button
            key={a.id}
            type="button"
            className="chip"
            onClick={() => onDownload(a)}
            title={`Download ${a.name}`}
            style={{ ...style, cursor: "pointer" }}
          >
            {content}
          </button>
        ) : (
          <span key={a.id} className="chip" style={style}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
