import React, { useState } from "react";
import MultiLawyerSelector from "../lawyers/MultiLawyerSelector.jsx";
import TaskStatus from "./TaskStatus.jsx";
import AttachmentInput from "../ui/AttachmentInput.jsx";
import AttachmentList from "../ui/AttachmentList.jsx";
import { tasks as tasksApi } from "../../lib/api.js";
import { TASK_STATUSES } from "../../data/nomenclature.js";

/**
 * Single Task component reused across:
 *  - Create Case page   (mode="draft"  — unsaved, inline editable, removable)
 *  - Case Details page  (mode="full"   — persisted, editable, status + reassignment)
 *  - Lawyer Portal      (mode="portal" — read-mostly + "Start Working"/"Mark Completed")
 *  - Calendar day cell renders its own compact pill (kept separate — see Calendar.jsx)
 *
 * A task can be assigned to multiple lawyers at once (MultiLawyerSelector),
 * and can carry file attachments (hearing notices, evidence, forms) that any
 * assigned lawyer can view from the Lawyer Portal.
 */
export default function TaskCard({
  task,
  mode = "full",
  caseMeta,
  lawyerNameOf,
  onChange,
  onRemove,
  onStatusChange,
  onStartWorking,
  onAddAttachments,
}) {
  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  if (mode === "draft") {
    return (
      <div className="task-card">
        <div className="task-card-head">
          <input
            placeholder="Task name (e.g. Hearing)"
            value={task.name}
            onChange={(e) => onChange({ ...task, name: e.target.value })}
            style={{ fontWeight: 700, flex: 1, marginRight: 10 }}
          />
          <button
            type="button"
            className="icon-btn-sm del"
            title="Remove task"
            onClick={onRemove}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="field-row" style={{ marginTop: 10 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Task Date</label>
            <input
              type="date"
              value={task.date}
              onChange={(e) => onChange({ ...task, date: e.target.value })}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Assigned Advocate(s) — optional</label>
            <MultiLawyerSelector
              value={task.assignedLawyerIds || []}
              onChange={(ids) => onChange({ ...task, assignedLawyerIds: ids })}
            />
          </div>
        </div>
        <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
          <label>Notes (optional)</label>
          <textarea
            rows={2}
            placeholder="Additional task information…"
            value={task.notes}
            onChange={(e) => onChange({ ...task, notes: e.target.value })}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label
            style={{
              display: "block",
              fontSize: 11.5,
              color: "var(--text-muted)",
              fontWeight: 600,
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Attachments
          </label>
          <AttachmentInput
            value={task.attachments || []}
            onChange={(files) => onChange({ ...task, attachments: files })}
            label="Attach file(s)"
          />
        </div>
      </div>
    );
  }

  // "full" and "portal" modes — a persisted task
  const lawyerIds = task.assignedLawyerIds || [];

  async function handleAddFiles(files) {
    if (!files.length || !onAddAttachments) return;
    setUploading(true);
    try {
      await onAddAttachments(files);
    } finally {
      setUploading(false);
    }
  }

  async function handleDownloadAttachment(attachment) {
    setAttachmentError("");
    try {
      await tasksApi.downloadAttachment(task.id, attachment);
    } catch (error) {
      setAttachmentError(
        error.message || "Could not download this attachment.",
      );
    }
  }

  return (
    <div className="task-card">
      <div className="task-card-head">
        <div>
          <div className="t-name">{task.name}</div>
          <div className="t-meta">
            {task.date && <span>📅 {task.date}</span>}
            {caseMeta && <span className="mono">{caseMeta.caseId}</span>}
            {caseMeta?.clientName && <span>{caseMeta.clientName}</span>}
          </div>
          {lawyerIds.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                marginTop: 6,
              }}
            >
              {lawyerIds.map((id) => (
                <span
                  key={id}
                  className="chip"
                  style={{ padding: "3px 9px", fontSize: 11 }}
                >
                  {lawyerNameOf ? lawyerNameOf(id) : id}
                </span>
              ))}
            </div>
          )}
        </div>
        <TaskStatus status={task.status} />
      </div>
      {task.notes && (
        <div
          style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}
        >
          {task.notes}
        </div>
      )}
      <AttachmentList
        attachments={task.attachments}
        compact
        onDownload={handleDownloadAttachment}
      />
      {attachmentError && (
        <div className="err-text" role="alert">
          {attachmentError}
        </div>
      )}

      {mode === "full" && (
        <div
          className="t-actions"
          style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}
        >
          <select
            value={task.status}
            onChange={(e) => onStatusChange?.(e.target.value)}
            style={{
              background: "var(--surface-3)",
              border: "1px solid var(--line)",
              color: "var(--text)",
              borderRadius: 7,
              padding: "5px 8px",
              fontSize: 12,
            }}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {onAddAttachments && (
            <AttachmentInput
              value={[]}
              onChange={handleAddFiles}
              label={uploading ? "Uploading…" : "+ Add File"}
            />
          )}
          {onRemove && (
            <button
              className="icon-btn-sm del"
              title="Delete task"
              onClick={onRemove}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      )}

      {mode === "portal" &&
        task.status !== "Completed" &&
        (onStatusChange || onStartWorking) && (
          <div className="t-actions" style={{ marginTop: 10 }}>
            {task.status !== "In Process" && (
              <button
                className="btn btn-primary btn-sm"
                onClick={onStartWorking}
              >
                Start Working
              </button>
            )}
            {task.status === "In Process" && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onStatusChange?.("Completed")}
              >
                Mark Completed
              </button>
            )}
          </div>
        )}
    </div>
  );
}
