import React from 'react';

export default function ClientDetails({ client, onEdit }) {
  if (!client) return null;
  return (
    <div className="card">
      <div className="card-head">
        <h3>Client Information</h3>
        {onEdit && <button className="link" onClick={onEdit}>Edit</button>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>{client.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{client.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{client.email || 'No email on file'}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
        <Row label="Phone" value={client.phone} />
        <Row label="Address" value={client.address} />
        {client.notes && <Row label="Notes" value={client.notes} />}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ textAlign: 'right', maxWidth: '65%' }}>{value || '—'}</span>
    </div>
  );
}
