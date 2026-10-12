import React, { useState } from "react";
import Modal from "../ui/Modal.jsx";
import SubmitProgress from "../ui/SubmitProgress.jsx";
import { whatsApp } from "../../lib/api.js";

export default function ClientPaymentReminderModal({
  client,
  cases = [],
  outstanding = 0,
  onClose,
  onSent,
}) {
  const primaryCase = cases[0];
  const caseIdStr = primaryCase?.caseId || "your legal matter";

  const defaultTemplates = [
    {
      id: "standard",
      label: "Standard Outstanding Fee",
      getText: () =>
        `Dear ${client?.name || "Client"},\n\nThis is a gentle payment reminder from PLUG SOLICITORS regarding your account. Your current outstanding balance is £ ${Number(outstanding).toLocaleString("en-GB")} for ${caseIdStr}.\n\nPlease let us know when you would like to proceed with the payment. Thank you!`,
    },
    {
      id: "installment",
      label: "Installment / Hearing Notice",
      getText: () =>
        `Dear ${client?.name || "Client"},\n\nWe request you to kindly settle the pending legal fee installment of £ ${Number(outstanding).toLocaleString("en-GB")} for matter ${caseIdStr} at your earliest convenience.\n\nWarm regards,\nPLUG SOLICITORS`,
    },
    {
      id: "custom",
      label: "Custom Message",
      getText: () => `Dear ${client?.name || "Client"},\n\n`,
    },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState("standard");
  const [message, setMessage] = useState(defaultTemplates[0].getText());
  const [phone, setPhone] = useState(client?.phone || "");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  function selectTemplate(tmpl) {
    setSelectedTemplate(tmpl.id);
    setMessage(tmpl.getText());
  }

  function close() {
    if (!sending) onClose();
  }

  async function handleSend() {
    if (sending) return;
    if (!message.trim()) {
      setErr("Please enter a message before sending.");
      return;
    }
    if (!phone.trim()) {
      setErr("Please enter a valid client WhatsApp phone number.");
      return;
    }

    setSending(true);
    setErr("");

    try {
      await whatsApp.sendMessage({ phoneNumber: phone, message });
      onSent?.();
      close();
    } catch (e) {
      setErr(e.message || "Failed to send WhatsApp payment reminder.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title="Send Payment Reminder"
      sub={`WhatsApp to ${client?.name}`}
      onClose={close}
      maxWidth="500px"
    >
      <div className="field">
        <label
          style={{
            fontWeight: 600,
            fontSize: 13,
            marginBottom: 8,
            display: "block",
          }}
        >
          Select Template
        </label>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          {defaultTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn btn-sm ${selectedTemplate === t.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => selectTemplate(t)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label style={{ fontWeight: 600, fontSize: 13 }}>
          Message Content (Editable)
        </label>
        <textarea
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            width: "100%",
            fontSize: 13.5,
            lineHeight: 1.5,
            background: "var(--surface-2)",
          }}
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
        <label
          style={{
            fontWeight: 600,
            fontSize: 12.5,
            color: "#25D366",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0012.04 2zm5.86 14.12c-.25.7-.72 1.28-1.42 1.63-.59.29-1.37.45-3.86-.58-3.08-1.28-5.06-4.4-5.21-4.61-.15-.2-1.24-1.65-1.24-3.15 0-1.5.78-2.24 1.06-2.54.28-.3.61-.37.82-.37.21 0 .42 0 .6.01.19.01.44-.07.69.53.25.6.86 2.1.94 2.25.08.15.13.33.03.53-.1.2-.15.33-.3.51-.15.18-.32.4-.46.54-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.05 1.13 1.01 2.09 1.32 2.39 1.47.3.15.47.13.65-.08.18-.2.77-.9 0.98-1.2.2-.3.42-.25.7-.15.28.1.1.77 1.78 3.86.88.22.1.37.15.47.15.1.01.21-.06.71-.76z" />
          </svg>
          Client WhatsApp Number
        </label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 923001234567 or 03001234567"
          style={{ width: "100%", marginTop: 6 }}
        />
      </div>

      {err && (
        <div className="err-text" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}

      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={close} disabled={sending}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? "Sending WhatsApp…" : "Send WhatsApp Reminder"}
        </button>
      </div>
      {sending && <SubmitProgress label="Sending WhatsApp reminder…" />}
    </Modal>
  );
}
