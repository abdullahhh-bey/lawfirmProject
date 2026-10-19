import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal.jsx";
import AttachmentInput from "../ui/AttachmentInput.jsx";
import SubmitProgress from "../ui/SubmitProgress.jsx";
import { messaging, whatsApp } from "../../lib/api.js";
import { useApp } from "../../context/AppContext.jsx";

export default function MessageComposer({
  lawyer,
  recipient,
  recipients: providedRecipients,
  portalOnly = false,
  onClose,
  onSent,
}) {
  const { session } = useApp();
  const isSenderLawyer = (session?.role || "").toLowerCase() === "lawyer";
  const initialTarget = recipient || lawyer || null;

  const [availableRecipients, setAvailableRecipients] = useState(providedRecipients || []);
  const [selectedRecipientId, setSelectedRecipientId] = useState(initialTarget?.id || "");
  const [selectedRecipient, setSelectedRecipient] = useState(initialTarget);

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  
  // When an advocate is sending, it is strictly Portal-only (no WhatsApp)
  const isStrictlyPortal = portalOnly || isSenderLawyer || selectedRecipient?.role === "admin";
  const [sendPortal, setSendPortal] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(!isStrictlyPortal);
  const [phone, setPhone] = useState(initialTarget?.phone || "");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (!initialTarget && (!providedRecipients || providedRecipients.length === 0)) {
      messaging.getRecipients().then((list) => {
        setAvailableRecipients(list);
        if (list.length > 0 && !selectedRecipientId) {
          setSelectedRecipientId(list[0].id);
          setSelectedRecipient(list[0]);
          setPhone(list[0].phone || "");
        }
      }).catch(() => {});
    }
  }, [initialTarget, providedRecipients]);

  function handleRecipientChange(id) {
    setSelectedRecipientId(id);
    const found = availableRecipients.find((r) => String(r.id) === String(id));
    setSelectedRecipient(found || null);
    if (found?.phone) setPhone(found.phone);
    if (found?.role === "admin" || isSenderLawyer) {
      setSendWhatsApp(false);
      setSendPortal(true);
    }
  }

  function close() {
    if (!sending) onClose();
  }

  async function send() {
    if (sending) return;
    setErr("");
    setStatusMsg("");

    const targetRecipient = selectedRecipient || initialTarget;
    if (!targetRecipient || !targetRecipient.id) {
      setErr("Please select a recipient.");
      return;
    }

    if (!text.trim() && attachments.length === 0) {
      setErr("Write a message or attach a file before sending.");
      return;
    }

    const effectivePortal = isStrictlyPortal ? true : sendPortal;
    const effectiveWhatsApp = isStrictlyPortal ? false : sendWhatsApp;

    if (!effectivePortal && !effectiveWhatsApp) {
      setErr("Select at least one destination channel (Portal or WhatsApp).");
      return;
    }
    if (effectiveWhatsApp && !phone.trim()) {
      setErr("Enter the WhatsApp phone number to send via WhatsApp.");
      return;
    }

    setSending(true);
    let record = null;
    let waSuccess = false;

    try {
      if (effectivePortal) {
        record = await messaging.send({
          recipientIds: [targetRecipient.id],
          text,
          attachments,
        });
      }

      if (effectiveWhatsApp) {
        if (text.trim()) {
          await whatsApp.sendMessage({
            phoneNumber: phone,
            message: `[PLUG SOLICITORS - ${targetRecipient.name}]\n${text}`,
          });
        }

        for (const att of attachments) {
          let fileToSend = att.rawFile || att.file;
          if (!fileToSend && att.dataUrl) {
            try {
              const arr = att.dataUrl.split(",");
              const mimeMatch = arr[0].match(/:(.*?);/);
              const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) u8arr[n] = bstr.charCodeAt(n);
              fileToSend = new File([u8arr], att.name || "attachment", { type: mime });
            } catch (err) {
              console.error("Failed to convert dataUrl to File", err);
            }
          }

          if (fileToSend) {
            await whatsApp.sendFile({
              phoneNumber: phone,
              file: fileToSend,
              caption: text.trim() ? `Attachment: ${att.name}` : `[PLUG SOLICITORS] Attachment: ${att.name}`,
            });
          }
        }
        waSuccess = true;
      }

      onSent?.(record, { portal: effectivePortal, whatsapp: waSuccess });
      close();
    } catch (e) {
      setErr(e.message || "An error occurred while sending message.");
    } finally {
      setSending(false);
    }
  }

  const modalTitle = isStrictlyPortal ? "Portal Message" : "Send Message";
  const modalSub = initialTarget
    ? `To ${initialTarget.name}`
    : selectedRecipient
    ? `To ${selectedRecipient.name}`
    : "Select recipient below";

  return (
    <Modal title={modalTitle} sub={modalSub} onClose={close} maxWidth="480px">
      {!initialTarget && (
        <div className="field">
          <label>Recipient <span className="req">*</span></label>
          <select
            value={selectedRecipientId}
            onChange={(e) => handleRecipientChange(e.target.value)}
          >
            {availableRecipients.length === 0 && (
              <option value="">Loading contacts…</option>
            )}
            {availableRecipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.role ? `(${r.role.toUpperCase()})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label>Message</label>
        <textarea
          rows={4}
          placeholder='Type your message or update here…'
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      </div>

      <div className="field">
        <label>Attachments (PDFs, Docs, Images, Files up to 50MB)</label>
        <AttachmentInput
          value={attachments}
          onChange={setAttachments}
          label="Attach documents or files"
        />
      </div>

      {isStrictlyPortal ? (
        <div
          style={{
            background: "var(--surface-2)",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            color: "var(--accent)",
            fontWeight: 600,
          }}
        >
          <span>🔒</span>
          <span>Internal Portal Message — Delivered directly to portal inbox with file sharing.</span>
        </div>
      ) : (
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
          <div style={{ display: "flex", gap: 16, marginBottom: sendWhatsApp ? 10 : 0 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={sendPortal}
                onChange={(e) => setSendPortal(e.target.checked)}
              />
              Internal Portal
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#25D366", fontWeight: 600 }}>
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
      )}

      {err && <div className="err-text" style={{ marginTop: 10 }}>{err}</div>}
      {statusMsg && <div style={{ color: "var(--green)", fontSize: 12, marginTop: 8 }}>{statusMsg}</div>}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={close} disabled={sending}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={send} disabled={sending}>
          {sending ? "Sending…" : "Send Message"}
        </button>
      </div>
      {sending && <SubmitProgress label="Sending message and files…" />}
    </Modal>
  );
}
