import React from 'react';
import StatusBadge from '../ui/StatusBadge.jsx';

// Shows delivery status for a sent message/notification, per recipient.
export default function NotificationStatus({ recipientStatus, recipients, lawyerNameOf }) {
  // If structured recipients array with names is provided, use it directly
  if (Array.isArray(recipients) && recipients.length > 0) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {recipients.map((r) => (
          <span
            key={r.recipientId}
            className="chip"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>👤 {r.recipientName || 'Recipient'}</span>
            <StatusBadge status={r.status || 'Delivered'} />
          </span>
        ))}
      </div>
    );
  }

  const entries = Object.entries(recipientStatus || {});
  if (entries.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {entries.map(([id, status]) => {
        let name = lawyerNameOf ? lawyerNameOf(id) : id;
        // If name resolved to a raw GUID (e.g. Admin or missing lawyer), display clean label
        if (typeof name === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name)) {
          name = 'Admin';
        }
        return (
          <span key={id} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>👤 {name}</span>
            <StatusBadge status={status} />
          </span>
        );
      })}
    </div>
  );
}
