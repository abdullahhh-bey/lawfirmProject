import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { generateReceiptPng } from '../../lib/receiptGenerator.js';
import { whatsApp } from '../../lib/api.js';

export default function ReceiptModal({ client, caseId, entry, totalAgreed, officeBalance, onClose, onSent }) {
  const [dataUrl, setDataUrl] = useState('');
  const [fileBlob, setFileBlob] = useState(null);
  const [receiptNo, setReceiptNo] = useState('');
  const [phone, setPhone] = useState(client?.phone || '');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    generateReceiptPng({ client, caseId, entry, totalAgreed, officeBalance }).then(res => {
      setDataUrl(res.dataUrl);
      setFileBlob(res.blob);
      setReceiptNo(res.receiptNo);
    });
  }, [client, caseId, entry, totalAgreed, officeBalance]);

  function downloadReceipt() {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Payment_Receipt_${receiptNo}_${client?.name || 'Client'}.png`;
    a.click();
  }

  async function sendWhatsApp() {
    if (!fileBlob || !phone.trim()) {
      setErr('Please provide a valid client phone number.');
      return;
    }
    setSending(true);
    setErr('');
    setStatusMsg('');

    try {
      const file = new File([fileBlob], `Payment_Receipt_${receiptNo}.png`, { type: 'image/png' });
      const caption = `[CASEWELL LAW FIRM]\nDear ${client?.name || 'Client'},\nThank you for your payment. Attached is your official payment receipt (${receiptNo}) for Rs ${Number(entry.amount || 0).toLocaleString()}.`;

      await whatsApp.sendFile({ phoneNumber: phone, file, caption });
      setStatusMsg('Receipt sent successfully to client WhatsApp!');
      onSent?.();
    } catch (e) {
      setErr(e.message || 'Failed to send WhatsApp receipt.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title="Payment Receipt Generated" sub={`Receipt #${receiptNo} · ${client?.name}`} onClose={onClose} maxWidth="600px">
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Payment Receipt"
            style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: 8, border: '1px solid var(--line)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
        ) : (
          <div style={{ padding: 40, color: 'var(--text-muted)' }}>Generating receipt image…</div>
        )}
      </div>

      <div className="field" style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--line)' }}>
        <label style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: '#25D366' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0012.04 2zm5.86 14.12c-.25.7-.72 1.28-1.42 1.63-.59.29-1.37.45-3.86-.58-3.08-1.28-5.06-4.4-5.21-4.61-.15-.2-1.24-1.65-1.24-3.15 0-1.5.78-2.24 1.06-2.54.28-.3.61-.37.82-.37.21 0 .42 0 .6.01.19.01.44-.07.69.53.25.6.86 2.1.94 2.25.08.15.13.33.03.53-.1.2-.15.33-.3.51-.15.18-.32.4-.46.54-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.05 1.13 1.01 2.09 1.32 2.39 1.47.3.15.47.13.65-.08.18-.2.77-.9 0.98-1.2.2-.3.42-.25.7-.15.28.1.1.77 1.78 3.86.88.22.1.37.15.47.15.1.01.21-.06.71-.76z"/>
          </svg>
          Send Receipt to Client WhatsApp
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            type="text"
            placeholder="Client WhatsApp number (e.g. 923001234567)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={sendWhatsApp} disabled={sending || !dataUrl}>
            {sending ? 'Sending…' : 'Send WhatsApp PNG'}
          </button>
        </div>
      </div>

      {err && <div className="err-text" style={{ marginTop: 10 }}>{err}</div>}
      {statusMsg && <div style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600, marginTop: 10 }}>{statusMsg}</div>}

      <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={downloadReceipt} disabled={!dataUrl}>
          ⬇ Download PNG Receipt
        </button>
        <button className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
