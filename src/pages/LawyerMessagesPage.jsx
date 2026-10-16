import React, { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar.jsx";
import AttachmentList from "../components/ui/AttachmentList.jsx";
import { messaging } from "../lib/api.js";
import { useApp } from "../context/AppContext.jsx";

export default function LawyerMessagesPage() {
  const { session, showToast } = useApp();
  const [msgs, setMsgs] = useState([]);

  useEffect(() => {
    messaging.listForLawyer(session.id).then(setMsgs);
  }, [session.id]);

  function getStatus(recipientStatus, lawyerId) {
    if (!recipientStatus || !lawyerId) return "Pending";
    const target = (lawyerId || "").toLowerCase();
    for (const [k, v] of Object.entries(recipientStatus)) {
      if ((k || "").toLowerCase() === target) return v;
    }
    return recipientStatus[lawyerId] || "Pending";
  }

  async function open(m) {
    if (getStatus(m.recipientStatus, session.id) !== "Seen") {
      await messaging.markSeen(m.id, session.id);
      setMsgs(await messaging.listForLawyer(session.id));
    }
  }

  async function downloadAttachment(attachment) {
    try {
      await messaging.downloadAttachment(attachment);
    } catch (error) {
      showToast(
        error.message || "Could not download this attachment.",
        "error",
      );
    }
  }

  return (
    <>
      <Topbar />
      <div className="page messaging-page">
        <div className="page-head">
          <div>
            <h1>Messages</h1>
            <div className="sub">
              Messages and reminders sent to you by Admin.
            </div>
          </div>
        </div>
        <div className="msg-thread messaging-inbox">
          {msgs.length === 0 && (
            <div className="messaging-empty">
              No messages yet.
            </div>
          )}
          {msgs.map((m) => {
            const st = getStatus(m.recipientStatus, session.id);
            return (
              <div
                key={m.id}
                className={`msg-log-row messaging-message-card${st === "Seen" ? "" : " unread"}`}
                onClick={() => open(m)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    open(m);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open ${m.type} message sent ${new Date(m.createdAt).toLocaleString()}`}
              >
                <div className="messaging-message-meta">
                  <span className="messaging-type">{m.type}</span>
                  <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString()}</time>
                </div>
                {m.text && <p className="messaging-message-text">{m.text}</p>}
                <AttachmentList
                  attachments={m.attachments}
                  compact
                  onDownload={downloadAttachment}
                />
                <div className="messaging-message-status">
                  <span className={`badge ${st.toLowerCase()}`}>{st}</span>
                  {st !== "Seen" && <span className="messaging-unread-label">New message</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
