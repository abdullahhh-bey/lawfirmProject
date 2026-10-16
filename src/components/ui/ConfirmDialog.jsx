import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmDialog({
  title,
  activity,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  variant, // 'danger' | 'warning' | 'primary'
  details = [], // [{ label, value, mono }]
  impactNotes = [], // string[]
  onConfirm,
  onCancel,
}) {
  const [processing, setProcessing] = useState(false);
  const effectiveVariant = variant || (danger ? 'danger' : 'primary');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !processing) {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, processing]);

  async function handleConfirm() {
    if (processing) return;
    setProcessing(true);
    try {
      await onConfirm();
    } finally {
      setProcessing(false);
    }
  }

  function handleCancel() {
    if (!processing) {
      onCancel();
    }
  }

  return createPortal(
    <div
      className="confirm-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !processing) handleCancel();
      }}
      role="presentation"
    >
      <div
        className="confirm-box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className={`confirm-glow ${effectiveVariant}`} />

        <div className={`confirm-icon-wrap ${effectiveVariant}`}>
          {effectiveVariant === 'danger' && (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6" />
              <path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          )}
          {effectiveVariant === 'warning' && (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {effectiveVariant === 'primary' && (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          )}
        </div>

        {activity && (
          <div className={`confirm-badge ${effectiveVariant}`}>
            <span style={{ fontSize: 13, lineHeight: 1 }}>●</span> {activity}
          </div>
        )}

        <h3 id="confirm-dialog-title" className="confirm-title">
          {title || 'Are you sure?'}
        </h3>

        {message && (
          <p id="confirm-dialog-message" className="confirm-message">
            {message}
          </p>
        )}

        {details && details.length > 0 && (
          <div className="confirm-card">
            {details.map((item, idx) => (
              <div key={idx} className="confirm-card-item">
                <span className="confirm-card-label">{item.label}</span>
                <span className={`confirm-card-val${item.mono ? ' mono' : ''}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {impactNotes && impactNotes.length > 0 && (
          <div className="confirm-impacts-box">
            {impactNotes.map((note, idx) => (
              <div key={idx} className="confirm-impact-item">
                <span className="confirm-impact-bullet">✕</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}

        <div className="confirm-actions-row">
          <button
            type="button"
            className="btn confirm-btn-cancel"
            onClick={handleCancel}
            disabled={processing}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn confirm-btn-action ${effectiveVariant}`}
            onClick={handleConfirm}
            disabled={processing}
          >
            {processing ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="confirm-spin" /> Processing…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
