import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ title, sub, onClose, children, maxWidth, className = '' }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section
        className={`modal-box${className ? ` ${className}` : ''}`}
        style={maxWidth ? { maxWidth } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-head">
          <div>
            <h3 id="modal-title">{title}</h3>
            {sub && <div className="sub">{sub}</div>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}
