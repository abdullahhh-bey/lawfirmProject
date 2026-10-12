import React, { useState } from "react";
import Modal from "../ui/Modal.jsx";
import AttachmentInput from "../ui/AttachmentInput.jsx";
import SubmitProgress from "../ui/SubmitProgress.jsx";
import { messaging } from "../../lib/api.js";

export default function BroadcastComposer({
  lawyers,
  initialSelected = [],
  onClose,
  onSent,
}) {
  const [selected, setSelected] = useState(new Set(initialSelected));
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allSelected =
    lawyers.length > 0 && lawyers.every((l) => selected.has(l.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(lawyers.map((l) => l.id)));

  function close() {
    if (!sending) onClose();
  }

  async function send() {
    if (sending) return;
    setErr("");
    if (!text.trim() && attachments.length === 0) {
      setErr("Write a message or attach a file before sending.");
      return;
    }
    if (selected.size === 0) {
      setErr("Select at least one advocate.");
      return;
    }
    setSending(true);
    try {
      const record = await messaging.send({
        recipientIds: [...selected],
        text,
        attachments,
      });
      onSent?.(record);
      close();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title="Send Message to Advocates"
      sub={`${selected.size} selected`}
      onClose={close}
      maxWidth="480px"
    >
      <div className="field">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Recipients
          <button
            type="button"
            className="link"
            style={{
              textTransform: "none",
              fontWeight: 600,
              color: "var(--accent)",
            }}
            onClick={toggleAll}
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        </label>
        <div
          style={{
            maxHeight: 190,
            overflowY: "auto",
            border: "1px solid var(--line)",
            borderRadius: 9,
            background: "var(--surface-2)",
          }}
        >
          {lawyers.map((l) => (
            <label
              key={l.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 13px",
                borderBottom: "1px solid var(--line)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(l.id)}
                onChange={() => toggle(l.id)}
              />
              <span style={{ fontWeight: 600 }}>{l.name}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                {l.email}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Message</label>
        <textarea
          rows={4}
          placeholder="Write a custom message, or a reminder (hearing, submission, deadline, meeting)…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Attachment (optional)</label>
        <AttachmentInput
          value={attachments}
          onChange={setAttachments}
          label="Attach image or file"
        />
      </div>
      {err && (
        <div className="err-text" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={close} disabled={sending}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={send} disabled={sending}>
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
      {sending && <SubmitProgress label="Sending message to advocates…" />}
    </Modal>
  );
}
