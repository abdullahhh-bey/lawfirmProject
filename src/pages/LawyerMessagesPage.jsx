import React, { useEffect, useState } from 'react';
import Topbar from '../components/layout/Topbar.jsx';
import AttachmentList from '../components/ui/AttachmentList.jsx';
import { messaging } from '../lib/api.js';
import { useApp } from '../context/AppContext.jsx';

export default function LawyerMessagesPage() {
  const { session } = useApp();
  const [msgs, setMsgs] = useState([]);

  useEffect(() => { messaging.listForLawyer(session.id).then(setMsgs); }, [session.id]);

  function getStatus(recipientStatus, lawyerId) {
    if (!recipientStatus || !lawyerId) return 'Pending';
    const target = (lawyerId || '').toLowerCase();
    for (const [k, v] of Object.entries(recipientStatus)) {
      if ((k || '').toLowerCase() === target) return v;
    }
    return recipientStatus[lawyerId] || 'Pending';
  }

  async function open(m) {
    if (getStatus(m.recipientStatus, session.id) !== 'Seen') {
      await messaging.markSeen(m.id, session.id);
      setMsgs(await messaging.listForLawyer(session.id));
    }
  }

  return (
    <>
      <Topbar />
      <div className="page">
        <div className="page-head"><div><h1>Messages</h1><div className="sub">Messages and reminders sent to you by Admin.</div></div></div>
        <div className="msg-thread">
          {msgs.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No messages yet.</div>}
          {msgs.map(m => {
            const st = getStatus(m.recipientStatus, session.id);
            return (
              <div key={m.id} className="msg-log-row clickable" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6, cursor: 'pointer' }} onClick={() => open(m)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span className="chip" style={{ textTransform: 'capitalize' }}>{m.type}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                {m.text && <div style={{ fontSize: 13 }}>{m.text}</div>}
                <AttachmentList attachments={m.attachments} compact />
                <span className={`badge ${st.toLowerCase()}`}>{st}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
