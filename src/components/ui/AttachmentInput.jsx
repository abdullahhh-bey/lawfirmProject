import React, { useRef, useState } from 'react';
import { filesToAttachments, formatBytes } from '../../lib/files.js';

// value: array of attachment objects (already-picked, not yet saved)
export default function AttachmentInput({ value = [], onChange, multiple = true, label = 'Attach files' }) {
  const inputRef = useRef(null);
  const [err, setErr] = useState('');

  async function handleFiles(e) {
    setErr('');
    try {
      const picked = await filesToAttachments(e.target.files);
      onChange(multiple ? [...value, ...picked] : picked);
    } catch (e) {
      setErr(e.message);
    } finally {
      e.target.value = '';
    }
  }

  function remove(id) {
    onChange(value.filter(a => a.id !== id));
  }

  return (
    <div>
      <input ref={inputRef} type="file" multiple={multiple} onChange={handleFiles} style={{ display: 'none' }} />
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.67 3.67 0 0 1 5.19 5.19L9.66 17.65a1.83 1.83 0 0 1-2.6-2.6l8.49-8.49" /></svg>
        {label}
      </button>
      {err && <div className="err-text" style={{ marginTop: 8 }}>{err}</div>}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {value.map(a => (
            <span key={a.id} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              📎 {a.name} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({formatBytes(a.size)})</span>
              <button type="button" onClick={() => remove(a.id)} style={{ color: 'var(--red)', fontWeight: 700, lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
