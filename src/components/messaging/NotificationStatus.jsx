import React from 'react';
import StatusBadge from '../ui/StatusBadge.jsx';

// Shows delivery status for a sent message/notification, per recipient.
// Used in the Messaging log (Admin) and on assignment notices (Case Details).
export default function NotificationStatus({ recipientStatus, lawyerNameOf }) {
  const entries = Object.entries(recipientStatus || {});
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {entries.map(([id, status]) => (
        <span key={id} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {lawyerNameOf ? lawyerNameOf(id) : id}
          <StatusBadge status={status} />
        </span>
      ))}
    </div>
  );
}
