import React, { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar.jsx";
import AttachmentList from "../components/ui/AttachmentList.jsx";
import MessageComposer from "../components/messaging/MessageComposer.jsx";
import { messaging } from "../lib/api.js";
import { useApp } from "../context/AppContext.jsx";

export default function LawyerMessagesPage() {
  const { session, showToast } = useApp();
  const [msgs, setMsgs] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);

  function reload() {
    messaging.listForLawyer(session.id).then(setMsgs);
  }

  useEffect(() => {
    reload();
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
    if (m.senderId !== session.id && getStatus(m.recipientStatus, session.id) !== "Seen") {
      await messaging.markSeen(m.id, session.id);
      reload();
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
              Secure portal messages and file sharing with Admin and fellow advocates.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setComposerOpen(true)}
          >
            + New Message
          </button>
        </div>

        <div className="msg-thread messaging-inbox">
          {msgs.length === 0 && (
            <div className="messaging-empty">
              No messages yet. Click "+ New Message" to message the Admin or fellow advocates.
            </div>
          )}

          {msgs.map((m) => {
            const isMine = (m.senderId || "").toLowerCase() === (session.id || "").toLowerCase();
            const st = getStatus(m.recipientStatus, session.id);

            return (
              <div
                key={m.id}
                className={`msg-log-row messaging-message-card${!isMine && st !== "Seen" ? " unread" : ""}`}
                onClick={() => open(m)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    open(m);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open message sent ${new Date(m.createdAt).toLocaleString()}`}
              >
                <div className="messaging-message-meta">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isMine ? "var(--text-muted)" : "var(--accent)",
                      }}
                    >
                      {isMine ? "Sent by You" : `From: ${m.senderName || "Admin"}`}
                    </span>
                    <span className="messaging-type">{m.type}</span>
                  </div>
                  <time dateTime={m.createdAt}>
                    {new Date(m.createdAt).toLocaleString()}
                  </time>
                </div>

                {m.text && <p className="messaging-message-text">{m.text}</p>}

                <AttachmentList
                  attachments={m.attachments}
                  compact
                  onDownload={downloadAttachment}
                />

                <div className="messaging-message-status">
                  {!isMine && (
                    <>
                      <span className={`badge ${st.toLowerCase()}`}>{st}</span>
                      {st !== "Seen" && (
                        <span className="messaging-unread-label">New message</span>
                      )}
                    </>
                  )}
                  {isMine && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                      Delivered via Portal
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {composerOpen && (
        <MessageComposer
          portalOnly={true}
          onClose={() => setComposerOpen(false)}
          onSent={() => {
            reload();
            showToast("Message sent successfully.");
          }}
        />
      )}
    </>
  );
}
