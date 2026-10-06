import React, { useState } from "react";
import Modal from "../ui/Modal.jsx";
import AttachmentInput from "../ui/AttachmentInput.jsx";
import { messaging, whatsApp } from "../../lib/api.js";

export default function MessageComposer({ lawyer, onClose, onSent }) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sendPortal, setSendPortal] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [phone, setPhone] = useState(lawyer?.phone || "");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  async function send() {
    setErr("");
    setStatusMsg("");
    if (!text.trim() && attachments.length === 0) {
      setErr("Write a message or attach a file before sending.");
      return;
    }
    if (!sendPortal && !sendWhatsApp) {
      setErr("Select at least one destination channel (Portal or WhatsApp).");
      return;
    }
    if (sendWhatsApp && !phone.trim()) {
      setErr("Enter the advocate WhatsApp phone number to send via WhatsApp.");
      return;
    }

    setSending(true);
    let record = null;
    let waSuccess = false;

    try {
      if (sendPortal) {
        record = await messaging.send({
          recipientIds: [lawyer.id],
          text,
          attachments,
        });
      }

      if (sendWhatsApp) {
        // Send main text message if text present
        if (text.trim()) {
          await whatsApp.sendMessage({
            phoneNumber: phone,
            message: `[Plug Solicitor - ${lawyer.name}]\n${text}`,
          });
        }

        // Send attachments if present
        for (const att of attachments) {
          let fileToSend = att.rawFile || att.file;
          if (!fileToSend && att.dataUrl) {
            try {
              const arr = att.dataUrl.split(",");
              const mimeMatch = arr[0].match(/:(.*?);/);
              const mime = mimeMatch
                ? mimeMatch[1]
                : "application/octet-stream";
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              fileToSend = new File([u8arr], att.name || "attachment", {
                type: mime,
              });
            } catch (err) {
              console.error("Failed to convert dataUrl to File", err);
            }
          }

          if (fileToSend) {
            await whatsApp.sendFile({
              phoneNumber: phone,
              file: fileToSend,
              caption: text.trim()
                ? `Attachment: ${att.name}`
                : `[Plug Solicitor] Attachment: ${att.name}`,
            });
          }
        }
        waSuccess = true;
      }

      onSent?.(record, { portal: sendPortal, whatsapp: waSuccess });
      onClose();
    } catch (e) {
      setErr(e.message || "An error occurred while sending message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title="Send Message"
      sub={`To ${lawyer.name}`}
      onClose={onClose}
      maxWidth="460px"
    >
      <div className="field">
        <label>Message</label>
        <textarea
          rows={4}
          placeholder='e.g. "Your hearing task is scheduled for tomorrow."'
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      </div>

      <div className="field">
        <label>Attachment (optional)</label>
        <AttachmentInput
          value={attachments}
          onChange={setAttachments}
          label="Attach image or file"
        />
      </div>

      <div
        className="field"
        style={{
          background: "var(--surface-2)",
          padding: 12,
          borderRadius: 8,
          border: "1px solid var(--line)",
        }}
      >
        <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
          Delivery Channels
        </label>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: sendWhatsApp ? 10 : 0,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={sendPortal}
              onChange={(e) => setSendPortal(e.target.checked)}
            />
            Internal Portal
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 13,
              color: "#25D366",
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
            />
            WhatsApp
          </label>
        </div>

        {sendWhatsApp && (
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              WhatsApp Number (with country code):
            </label>
            <input
              type="text"
              placeholder="e.g. 923001234567 or +923001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ marginTop: 4, width: "100%" }}
            />
          </div>
        )}
      </div>

      {err && (
        <div className="err-text" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}
      {statusMsg && (
        <div style={{ color: "var(--green)", fontSize: 12, marginTop: 8 }}>
          {statusMsg}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={send} disabled={sending}>
          {sending ? "Sending…" : sendWhatsApp ? "Send via WhatsApp" : "Send"}
        </button>
      </div>
    </Modal>
  );
}
