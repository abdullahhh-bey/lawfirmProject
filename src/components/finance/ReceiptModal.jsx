import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal.jsx";
import { generateReceiptPng } from "../../lib/receiptGenerator.js";
import { whatsApp } from "../../lib/api.js";

export default function ReceiptModal({
  client,
  caseId,
  entry,
  totalAgreed,
  officeBalance,
  onClose,
  onSent,
}) {
  const [dataUrl, setDataUrl] = useState("");
  const [fileBlob, setFileBlob] = useState(null);
  const [receiptNo, setReceiptNo] = useState("");
  const [phone, setPhone] = useState(client?.phone || "");
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;

    generateReceiptPng({
      client,
      caseId,
      entry,
      totalAgreed,
      officeBalance,
    }).then((res) => {
      if (!mounted) return;

      setDataUrl(res.dataUrl);
      setFileBlob(res.blob);
      setReceiptNo(res.receiptNo);
    });

    return () => {
      mounted = false;
    };
  }, [client, caseId, entry, totalAgreed, officeBalance]);

  function downloadReceipt() {
    if (!dataUrl) return;

    const a = document.createElement("a");

    a.href = dataUrl;
    a.download = `Payment_Receipt_${receiptNo}_${client?.name || "Client"}.png`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function sendWhatsApp() {
    if (!fileBlob || !phone.trim()) {
      setErr("Please provide a valid client phone number.");
      return;
    }

    setSending(true);
    setErr("");
    setStatusMsg("");

    try {
      const file = new File([fileBlob], `Payment_Receipt_${receiptNo}.png`, {
        type: "image/png",
      });

      const amount = Number(entry?.amount ?? 0);

      const caption =
        `[Plug Solicitor]\n` +
        `Dear ${client?.name || "Client"},\n` +
        `Thank you for your payment. Attached is your official payment receipt ` +
        `(${receiptNo}) for £ ${amount.toLocaleString("en-GB")}.`;

      await whatsApp.sendFile({
        phoneNumber: phone,
        file,
        caption,
      });

      setStatusMsg("Receipt sent successfully to client WhatsApp!");

      onSent?.();
    } catch (e) {
      setErr(e.message || "Failed to send WhatsApp receipt.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title="Payment Receipt Generated"
      sub={`Receipt #${receiptNo} · ${client?.name || ""}`}
      onClose={onClose}
      maxWidth="600px"
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Payment Receipt"
            style={{
              maxWidth: "100%",
              maxHeight: "360px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
        ) : (
          <div
            style={{
              padding: 40,
              color: "var(--text-muted)",
            }}
          >
            Generating receipt image…
          </div>
        )}
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
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#25D366",
          }}
        >
          {/* Valid SVG - replaces malformed WhatsApp path */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9.4 9.4 0 0 1-4-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 3.5 12a8.5 8.5 0 1 1 17.5-.5Z" />
          </svg>
          Send Receipt to Client WhatsApp
        </label>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 8,
          }}
        >
          <input
            type="text"
            placeholder="Client WhatsApp number (e.g. 923001234567)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ flex: 1 }}
          />

          <button
            className="btn btn-primary"
            onClick={sendWhatsApp}
            disabled={sending || !dataUrl}
          >
            {sending ? "Sending…" : "Send WhatsApp PNG"}
          </button>
        </div>
      </div>

      {err && (
        <div className="err-text" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}

      {statusMsg && (
        <div
          style={{
            color: "var(--green)",
            fontSize: 13,
            fontWeight: 600,
            marginTop: 10,
          }}
        >
          {statusMsg}
        </div>
      )}

      <div
        className="modal-actions"
        style={{
          justifyContent: "space-between",
          marginTop: 16,
        }}
      >
        <button
          className="btn btn-ghost"
          onClick={downloadReceipt}
          disabled={!dataUrl}
        >
          ⬇ Download PNG Receipt
        </button>

        <button className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
