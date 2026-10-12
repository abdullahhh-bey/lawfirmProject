import React, { useState } from 'react';
import Modal from './Modal.jsx';
import SubmitProgress from './SubmitProgress.jsx';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  const [processing, setProcessing] = useState(false);

  async function confirm() {
    if (processing) return;
    setProcessing(true);
    try {
      await onConfirm();
    } finally {
      setProcessing(false);
    }
  }

  function cancel() {
    if (!processing) onCancel();
  }

  return (
    <Modal title={title} onClose={cancel} maxWidth="400px">
      <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>{message}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={cancel} disabled={processing}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={processing}>
          {processing ? 'Processing…' : confirmLabel}
        </button>
      </div>
      {processing && <SubmitProgress label="Processing your request…" />}
    </Modal>
  );
}
