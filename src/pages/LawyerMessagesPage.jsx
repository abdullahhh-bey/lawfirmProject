import React, { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar.jsx";
import AttachmentList from "../components/ui/AttachmentList.jsx";
import MessageComposer from "../components/messaging/MessageComposer.jsx";
import NotificationStatus from "../components/messaging/NotificationStatus.jsx";
import { messaging } from "../lib/api.js";
import { useApp } from "../context/AppContext.jsx";

export default function LawyerMessagesPage() {
  const { session, showToast } = useApp();
  const [msgs, setMsgs] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [targetRecipient, setTargetRecipient] = useState(null);
  const [activeTab, setActiveTab] = useState("received"); // 'received' | 'sent' | 'all'
  const [searchQuery, setSearchQuery] = useState("");

  function reload() {
    if (session?.id) {
      messaging.listForLawyer(session.id).then((list) => {
        setMsgs(list || []);
      });
    }
  }

  useEffect(() => {
    reload();
  }, [session?.id]);

  function getStatus(recipientStatus, lawyerId) {
    if (!recipientStatus || !lawyerId) return "Pending";
    const target = (lawyerId || "").toLowerCase();
    for (const [k, v] of Object.entries(recipientStatus)) {
      if ((k || "").toLowerCase() === target) return v;
    }
    return recipientStatus[lawyerId] || "Pending";
  }

  async function open(m) {
    const isMine = (m.senderId || "").toLowerCase() === (session?.id || "").toLowerCase();
    if (!isMine && getStatus(m.recipientStatus, session?.id) !== "Seen") {
      try {
        await messaging.markSeen(m.id, session?.id);
        reload();
      } catch {}
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

  function handleReply(m) {
    const isFromAdmin = m.senderRole === "admin" || m.senderName === "Admin";
    const target = {
      id: isFromAdmin ? "admin" : m.senderId,
      name: isFromAdmin ? "Admin" : (m.senderName || "Advocate"),
      role: isFromAdmin ? "admin" : "lawyer",
    };
    setTargetRecipient(target);
  }

  function handleNewMessage() {
    setTargetRecipient({ id: "admin", name: "Admin", role: "admin" });
    setComposerOpen(true);
  }

  const isSentByMe = (m) => (m.senderId || "").toLowerCase() === (session?.id || "").toLowerCase();

  const receivedMsgs = msgs.filter((m) => !isSentByMe(m));
  const sentMsgs = msgs.filter((m) => isSentByMe(m));

  let currentList = msgs;
  if (activeTab === "received") {
    currentList = receivedMsgs;
  } else if (activeTab === "sent") {
    currentList = sentMsgs;
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    currentList = currentList.filter(
      (m) =>
        (m.text || "").toLowerCase().includes(q) ||
        (m.senderName || "").toLowerCase().includes(q)
    );
  }

  return (
    <>
      <Topbar />
      <div className="page messaging-page">
        <div className="page-head">
          <div>
            <h1>Advocate Messages</h1>
            <div className="sub">
              Confidential portal messages and case file sharing with Admin and fellow co-advocates.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNewMessage}
          >
            + New Message
          </button>
        </div>

        <section className="card messaging-log-card">
          <div
            className="messaging-log-heading"
            style={{
              flexWrap: "wrap",
              gap: 12,
              borderBottom: "1px solid var(--line)",
              paddingBottom: 14,
            }}
          >
            <div>
              <h2 style={{ fontSize: 18 }}>Inbox & Conversations</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                Messages received from Admin and case mates, and your sent updates.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="search"
                placeholder="Search messages or sender…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  minWidth: 200,
                }}
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            className="tabs"
            style={{
              margin: "16px 0 14px",
              display: "flex",
              gap: 8,
              borderBottom: "1px solid var(--line)",
              paddingBottom: 4,
            }}
          >
            <button
              type="button"
              className={`tab${activeTab === "received" ? " active" : ""}`}
              onClick={() => setActiveTab("received")}
              style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span>📥 Received</span>
              <span
                style={{
                  background: activeTab === "received" ? "var(--accent)" : "var(--surface-3)",
                  color: activeTab === "received" ? "#fff" : "var(--text)",
                  borderRadius: 12,
                  padding: "2px 8px",
                  fontSize: 11.5,
                }}
              >
                {receivedMsgs.length}
              </span>
            </button>

            <button
              type="button"
              className={`tab${activeTab === "sent" ? " active" : ""}`}
              onClick={() => setActiveTab("sent")}
              style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span>📤 Sent by You</span>
              <span
                style={{
                  background: activeTab === "sent" ? "var(--accent)" : "var(--surface-3)",
                  color: activeTab === "sent" ? "#fff" : "var(--text)",
                  borderRadius: 12,
                  padding: "2px 8px",
                  fontSize: 11.5,
                }}
              >
                {sentMsgs.length}
              </span>
            </button>

            <button
              type="button"
              className={`tab${activeTab === "all" ? " active" : ""}`}
              onClick={() => setActiveTab("all")}
              style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span>📑 All Messages</span>
              <span
                style={{
                  background: activeTab === "all" ? "var(--accent)" : "var(--surface-3)",
                  color: activeTab === "all" ? "#fff" : "var(--text)",
                  borderRadius: 12,
                  padding: "2px 8px",
                  fontSize: 11.5,
                }}
              >
                {msgs.length}
              </span>
            </button>
          </div>

          {/* Empty State */}
          {currentList.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              {activeTab === "received"
                ? "No received messages yet."
                : activeTab === "sent"
                ? "You haven't sent any messages yet."
                : "No messages match your search."}
            </div>
          )}

          {/* Messages Feed */}
          <div className="msg-thread" style={{ display: "grid", gap: 14 }}>
            {currentList.map((m) => {
              const isMine = isSentByMe(m);
              const isFromAdmin = m.senderRole === "admin" || m.senderName === "Admin";
              const st = getStatus(m.recipientStatus, session?.id);

              return (
                <article
                  key={m.id}
                  className={`msg-log-row messaging-message-card${!isMine && st !== "Seen" ? " unread" : ""}`}
                  onClick={() => open(m)}
                  style={{
                    border: !isMine ? (isFromAdmin ? "1.5px solid #BBF7D0" : "1.5px solid #C7D2FE") : "1px solid var(--line)",
                    background: !isMine ? (isFromAdmin ? "#F7FEFA" : "#FAFBFF") : "var(--surface)",
                    borderRadius: 12,
                    padding: 18,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* Message Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {!isMine ? (
                        isFromAdmin ? (
                          <span
                            style={{
                              background: "#F0FDF4",
                              color: "#166534",
                              border: "1px solid #BBF7D0",
                              borderRadius: 8,
                              padding: "4px 10px",
                              fontWeight: 800,
                              fontSize: 13,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            🛡️ SENDER: Admin
                          </span>
                        ) : (
                          <span
                            style={{
                              background: "#EEF2FF",
                              color: "#3730A3",
                              border: "1px solid #C7D2FE",
                              borderRadius: 8,
                              padding: "4px 10px",
                              fontWeight: 800,
                              fontSize: 13,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            ⚖️ SENDER: Advocate {m.senderName || "Co-Advocate"}
                          </span>
                        )
                      ) : (
                        <span
                          style={{
                            background: "var(--surface-3)",
                            color: "var(--text)",
                            borderRadius: 8,
                            padding: "4px 10px",
                            fontWeight: 800,
                            fontSize: 13,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          👤 SENDER: You
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: m.type === "broadcast" ? "var(--amber)" : "var(--surface-3)",
                          color: m.type === "broadcast" ? "#fff" : "var(--text-muted)",
                        }}
                      >
                        {m.type === "broadcast" ? "Broadcast" : "Direct"}
                      </span>
                    </div>

                    <time
                      dateTime={m.createdAt}
                      style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}
                    >
                      {new Date(m.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>

                  {/* Message Body */}
                  {m.text && (
                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        color: "var(--text)",
                        background: !isMine ? "#FFFFFF" : "var(--surface-2)",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        margin: "8px 0 12px",
                      }}
                    >
                      {m.text}
                    </div>
                  )}

                  {/* Attachments */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <AttachmentList
                        attachments={m.attachments}
                        compact
                        onDownload={downloadAttachment}
                      />
                    </div>
                  )}

                  {/* Card Footer: Delivery Status & Quick Reply */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10,
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid var(--line)",
                    }}
                  >
                    <div>
                      {!isMine ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            Status:
                          </span>
                          <span className={`badge ${st.toLowerCase()}`}>{st}</span>
                          {st !== "Seen" && (
                            <span className="messaging-unread-label" style={{ fontSize: 11 }}>
                              ● Unread
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Delivered to:</span>
                          <NotificationStatus
                            recipientStatus={m.recipientStatus}
                            recipients={m.recipients}
                          />
                        </div>
                      )}
                    </div>

                    {!isMine && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReply(m);
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        title={`Reply directly to ${isFromAdmin ? "Admin" : m.senderName}`}
                      >
                        <span>↩ Reply to {isFromAdmin ? "Admin" : m.senderName}</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {(composerOpen || targetRecipient) && (
        <MessageComposer
          recipient={targetRecipient}
          portalOnly={true}
          onClose={() => {
            setComposerOpen(false);
            setTargetRecipient(null);
          }}
          onSent={() => {
            reload();
            showToast("Message sent successfully.");
          }}
        />
      )}
    </>
  );
}
