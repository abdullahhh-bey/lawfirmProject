import React from 'react';
import { isImageAttachment, formatBytes } from '../../lib/files.js';

export default function AttachmentList({ attachments = [], compact = false }) {
  if (!attachments.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: compact ? 6 : 10 }}>
      {attachments.map(a => (
        isImageAttachment(a) ? (
          <a key={a.id} href={a.dataUrl} download={a.name} title={a.name} style={{ display: 'block' }}>
            <img src={a.dataUrl} alt={a.name} style={{ width: compact ? 52 : 74, height: compact ? 52 : 74, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
          </a>
        ) : (
          <a key={a.id} href={a.dataUrl} download={a.name} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            📄 {a.name} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({formatBytes(a.size)})</span>
          </a>
        )
      ))}
    </div>
  );
}
