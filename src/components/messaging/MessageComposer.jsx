import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal.jsx";
import AttachmentInput from "../ui/AttachmentInput.jsx";
import SubmitProgress from "../ui/SubmitProgress.jsx";
import { messaging, whatsApp } from "../../lib/api.js";
import { useApp } from "../../context/AppContext.jsx";

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

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
  const defaultAdmin = { id: "admin", name: "Admin", role: "admin" };
  const initialTarget = recipient || lawyer || (isSenderLawyer ? defaultAdmin : null);

  const [availableRecipients, setAvailableRecipients] = useState(providedRecipients || []);
  const [loadingRecipients, setLoadingRecipients] = useState(!initialTarget && (!providedRecipients || providedRecipients.length === 0));
  const [selectedRecipientId, setSelectedRecipientId] = useState(initialTarget?.id || "");
  const [selectedRecipient, setSelectedRecipient] = useState(initialTarget);
  const [adminGuid, setAdminGuid] = useState(null);

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  
  // Advocate communication is strictly Portal-only (no WhatsApp)
  const isStrictlyPortal = portalOnly || isSenderLawyer || selectedRecipient?.role === "admin" || initialTarget?.role === "admin";
  const [sendPortal, setSendPortal] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(!isStrictlyPortal);
  const [phone, setPhone] = useState(initialTarget?.phone || "");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    let active = true;
    // Always attempt to discover admin's exact database GUID in background
    messaging.getRecipients().then((list) => {
      if (!active || !list) return;
      const adminItem = list.find((r) => r.role?.toLowerCase() === "admin" || (r.name || "").includes("Admin"));
      if (adminItem?.id) {
        setAdminGuid(adminItem.id);
      }
      if (!initialTarget && (!providedRecipients || providedRecipients.length === 0)) {
        setAvailableRecipients(list);
        if (list.length > 0 && !selectedRecipientId) {
          setSelectedRecipientId(list[0].id);
          setSelectedRecipient(list[0]);
          setPhone(list[0].phone || "");
        }
      }
    }).catch(() => {
      // Fallback: If loading fails or offline, default to Admin
      if (active && isSenderLawyer && !initialTarget) {
        setAvailableRecipients([defaultAdmin]);
        setSelectedRecipientId("admin");
        setSelectedRecipient(defaultAdmin);
      }
    }).finally(() => {
      if (active) setLoadingRecipients(false);
    });
    return () => { active = false; };
  }, [initialTarget, providedRecipients, isSenderLawyer, selectedRecipientId]);

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
    
    // Resolve effective target ID
    let targetId = targetRecipient?.id;
    if (!targetId || targetId === "admin" || targetRecipient?.role === "admin" || targetRecipient?.name === "Admin") {
      targetId = adminGuid || EMPTY_GUID; // If adminGuid is discovered, use it; otherwise backend maps EMPTY_GUID
    }

    if (!targetRecipient && !targetId) {
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
        setStatusMsg("Sending portal message…");
        record = await messaging.send({
          recipientIds: [targetId],
          text,
          attachments,
        });
      }

      if (effectiveWhatsApp) {
        setStatusMsg("Dispatching WhatsApp message…");
        if (text.trim()) {
          await whatsApp.sendMessage({
            phoneNumber: phone,
            message: `[PLUG SOLICITORS]\n\n${text}`,
          });
        }

        for (const att of attachments) {
          const fileToSend = att.rawFile || att.file;
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
      setErr(e.message || "An error occurred while sending message. Please try again.");
    } finally {
      setSending(false);
      setStatusMsg("");
    }
  }

  const effectiveTarget = selectedRecipient || initialTarget;
  const isTargetAdmin = effectiveTarget?.role === "admin" || effectiveTarget?.name === "Admin" || effectiveTarget?.id === "admin";
  const modalTitle = isStrictlyPortal ? "Portal Message" : "Send Message";
  const modalSub = effectiveTarget
    ? `To ${isTargetAdmin ? "Admin" : effectiveTarget.name}`
    : "Select an advocate below";

  return (
    <Modal title={modalTitle} sub={modalSub} onClose={close} maxWidth="500px">
      {err && <div className="err-banner" style={{ marginBottom: 14 }}>{err}</div>}

      {/* FIXED RECIPIENT DISPLAY (NO DROPDOWN IF TARGET IS PRE-SELECTED) */}
      {initialTarget ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              To:
            </span>
            <span style={{ fontWeight: 800, fontSize: 13.5, color: "var(--accent)" }}>
              {isTargetAdmin ? "🛡️ Admin" : `⚖️ Advocate: ${initialTarget.name}`}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              background: "var(--surface-3)",
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            Portal Secure
          </span>
        </div>
      ) : (
        /* RECIPIENT SELECTION DROPDOWN (ONLY SHOWN WHEN NO TARGET IS FIXED) */
        <div className="field">
          <label>Recipient <span className="req">*</span></label>
          <select
            value={selectedRecipientId}
            onChange={(e) => handleRecipientChange(e.target.value)}
            disabled={loadingRecipients || sending}
          >
            {loadingRecipients && <option value="">Loading contacts…</option>}
            {!loadingRecipients && availableRecipients.length === 0 && (
              <option value="">No contacts available</option>
            )}
            {availableRecipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.role === "admin" ? `🛡️ ${r.name || "Admin"}` : `⚖️ ${r.name}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label>Message</label>
        <textarea
          rows={4}
          placeholder="Type your portal message or notes here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          disabled={sending}
        />
      </div>

      <div className="field">
        <label>Attachments (PDFs, Docs, Images up to 50MB)</label>
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
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12.5,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>🔒</span>
          <span>Messages between advocates and Admin are strictly delivered via the secure portal.</span>
        </div>
      ) : (
        <div className="field">
          <label>Delivery Channels</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="checkbox-row" style={{ fontSize: 13 }}>
              <input
                type="checkbox"
                checked={sendPortal}
                onChange={(e) => setSendPortal(e.target.checked)}
                disabled={sending}
              />
              <span>Portal Message (visible in the firm CRM)</span>
            </label>
            <label className="checkbox-row" style={{ fontSize: 13 }}>
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                disabled={sending}
              />
              <span>WhatsApp Notification</span>
            </label>
          </div>
          {sendWhatsApp && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12 }}>Recipient WhatsApp Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +447123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={sending}
              />
            </div>
          )}
        </div>
      )}

      {sending && (
        <div style={{ marginTop: 12 }}>
          <SubmitProgress label={statusMsg || "Sending message…"} />
        </div>
      )}

      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={close}
          disabled={sending}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={send}
          disabled={sending}
        >
          {sending ? "Sending…" : "Send Message"}
        </button>
      </div>
    </Modal>
  );
}
