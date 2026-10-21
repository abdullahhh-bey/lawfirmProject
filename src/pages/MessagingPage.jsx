import React, { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar.jsx";
import MessageComposer from "../components/messaging/MessageComposer.jsx";
import BroadcastComposer from "../components/messaging/BroadcastComposer.jsx";
import NotificationStatus from "../components/messaging/NotificationStatus.jsx";
import AttachmentList from "../components/ui/AttachmentList.jsx";
import { lawyers as lawyersApi, messaging } from "../lib/api.js";
import { useApp } from "../context/AppContext.jsx";

export default function MessagingPage() {
  const { showToast, session } = useApp();
  const [lawyers, setLawyers] = useState([]);
  const [log, setLog] = useState([]);
  const [individualTarget, setIndividualTarget] = useState(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("received"); // 'received' | 'sent' | 'all'
  const [selectedAdvocateFilter, setSelectedAdvocateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  function reload() {
    Promise.all([lawyersApi.list(), messaging.list()]).then(([l, m]) => {
      setLawyers(l);
      setLog(m);
    });
  }
  useEffect(reload, []);

  const lawyerName = (id) => {
    if (!id) return "Admin";
    if (session?.id && (id || "").toLowerCase() === session.id.toLowerCase()) {
      return "Admin";
    }
    const found = lawyers.find((l) => (l.id || "").toLowerCase() === (id || "").toLowerCase());
    if (found?.name) return found.name;
    // Check if it's a GUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return "Admin";
    }
    return id;
  };

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

  // Determine if a message was sent by an advocate to admin
  function isReceivedFromAdvocate(m) {
    if (session?.id && (m.senderId || "").toLowerCase() === session.id.toLowerCase()) return false;
    if (m.senderName === "Admin") return false;

    // Must be sent to Admin (or Admin in recipients list)
    if (m.recipients && m.recipients.length > 0) {
      const isTargetedToAdmin = m.recipients.some(
        (r) =>
          (session?.id && (r.recipientId || "").toLowerCase() === session.id.toLowerCase()) ||
          (r.recipientRole || "").toLowerCase() === "admin" ||
          (r.recipientName || "").toLowerCase() === "admin"
      );
      if (!isTargetedToAdmin) {
        return false; // Private advocate-to-advocate message, ignore for Admin
      }
    }

    if (m.senderRole === "lawyer") return true;
    if (lawyers.some((l) => (l.id || "").toLowerCase() === (m.senderId || "").toLowerCase())) {
      return true;
    }
    return false;
  }

  function getSenderDisplayName(m) {
    if (m.senderName && m.senderName !== "Admin") {
      return m.senderName;
    }
    const found = lawyers.find((l) => (l.id || "").toLowerCase() === (m.senderId || "").toLowerCase());
    if (found?.name) return found.name;
    if (session?.id && (m.senderId || "").toLowerCase() === session.id.toLowerCase()) {
      return "Admin";
    }
    return m.senderRole === "lawyer" ? "Advocate" : "Admin";
  }

  function handleReply(senderId, senderName) {
    const found = lawyers.find(
      (l) => (l.id || "").toLowerCase() === (senderId || "").toLowerCase()
    ) || { id: senderId, name: senderName };
    setIndividualTarget(found);
  }

  const receivedMessages = log.filter(isReceivedFromAdvocate);
  const sentMessages = log.filter((m) => !isReceivedFromAdvocate(m));

  // Build unique advocates list who sent messages to admin
  const senderAdvocatesMap = new Map();
  receivedMessages.forEach((m) => {
    const name = getSenderDisplayName(m);
    const id = m.senderId;
    if (!senderAdvocatesMap.has(id)) {
      senderAdvocatesMap.set(id, { id, name, count: 0 });
    }
    senderAdvocatesMap.get(id).count += 1;
  });
  const senderAdvocatesList = Array.from(senderAdvocatesMap.values());

  // Determine messages to display based on current tab
  let currentList = log;
  if (activeTab === "received") {
    currentList = receivedMessages;
  } else if (activeTab === "sent") {
    currentList = sentMessages;
  }

  // Apply advocate sender filter if in received or all tab
  if (selectedAdvocateFilter !== "all" && activeTab !== "sent") {
    currentList = currentList.filter(
      (m) => (m.senderId || "").toLowerCase() === selectedAdvocateFilter.toLowerCase()
    );
  }

  // Apply search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    currentList = currentList.filter(
      (m) =>
        (m.text || "").toLowerCase().includes(q) ||
        getSenderDisplayName(m).toLowerCase().includes(q)
    );
  }

  return (
    <>
      <Topbar />
      <div className="page messaging-page">
        <div className="page-head">
          <div>
            <h1>Portal Messaging</h1>
            <div className="sub">
              Manage messages received from advocates and dispatch individual or broadcast announcements.
            </div>
          </div>
        </div>

        {/* Quick Send Cards */}
        <div className="grid grid-2 messaging-compose-options" style={{ marginBottom: 24 }}>
          <section className="card messaging-option-card">
            <div className="messaging-option-icon" aria-hidden="true">✉️</div>
            <h2>Message an Advocate</h2>
            <p>
              Select any advocate to send a private portal message or share files.
            </p>
            <select
              className="messaging-recipient-select"
              defaultValue=""
              aria-label="Choose an advocate to message"
              onChange={(e) => {
                const l = lawyers.find((x) => x.id === e.target.value);
                if (l) setIndividualTarget(l);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Choose an advocate to message…
              </option>
              {lawyers
                .filter((l) => l.active)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </section>

          <section className="card messaging-option-card">
            <div className="messaging-option-icon" aria-hidden="true">📢</div>
            <h2>Group / Broadcast Message</h2>
            <p>
              Select multiple advocates and broadcast announcements or firm-wide alerts.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setBroadcastOpen(true)}
              style={{ marginTop: 8 }}
            >
              Compose Broadcast
            </button>
          </section>
        </div>

        {/* Message Log & Sections */}
        <section className="card messaging-log-card">
          <div className="messaging-log-heading" style={{ flexWrap: "wrap", gap: 12, borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 18 }}>Messages</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                Easily track messages from advocates separately from messages sent by Admin.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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

          {/* Clean Segmented Navigation Tabs */}
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
              onClick={() => {
                setActiveTab("received");
                setSelectedAdvocateFilter("all");
              }}
              style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span>📥 Received from Advocates</span>
              <span
                style={{
                  background: activeTab === "received" ? "var(--accent)" : "var(--surface-3)",
                  color: activeTab === "received" ? "#fff" : "var(--text)",
                  borderRadius: 12,
                  padding: "2px 8px",
                  fontSize: 11.5,
                }}
              >
                {receivedMessages.length}
              </span>
            </button>

            <button
              type="button"
              className={`tab${activeTab === "sent" ? " active" : ""}`}
              onClick={() => {
                setActiveTab("sent");
                setSelectedAdvocateFilter("all");
              }}
              style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span>📤 Sent by Admin</span>
              <span
                style={{
                  background: activeTab === "sent" ? "var(--accent)" : "var(--surface-3)",
                  color: activeTab === "sent" ? "#fff" : "var(--text)",
                  borderRadius: 12,
                  padding: "2px 8px",
                  fontSize: 11.5,
                }}
              >
                {sentMessages.length}
              </span>
            </button>

            <button
              type="button"
              className={`tab${activeTab === "all" ? " active" : ""}`}
              onClick={() => {
                setActiveTab("all");
                setSelectedAdvocateFilter("all");
              }}
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
                {log.length}
              </span>
            </button>
          </div>

          {/* Quick Advocate Filter Pills (shown when advocates have sent messages) */}
          {activeTab !== "sent" && senderAdvocatesList.length > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 16,
                padding: "8px 12px",
                background: "var(--surface-2)",
                borderRadius: 9,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Filter Advocate:
              </span>
              <button
                type="button"
                className={`chip${selectedAdvocateFilter === "all" ? " chip-active" : ""}`}
                onClick={() => setSelectedAdvocateFilter("all")}
                style={{
                  cursor: "pointer",
                  fontWeight: selectedAdvocateFilter === "all" ? 800 : 500,
                  background: selectedAdvocateFilter === "all" ? "var(--accent-dim)" : "var(--surface)",
                  color: selectedAdvocateFilter === "all" ? "var(--accent)" : "inherit",
                }}
              >
                All Advocates ({receivedMessages.length})
              </button>
              {senderAdvocatesList.map((adv) => (
                <button
                  key={adv.id}
                  type="button"
                  className={`chip${selectedAdvocateFilter === adv.id ? " chip-active" : ""}`}
                  onClick={() => setSelectedAdvocateFilter(adv.id)}
                  style={{
                    cursor: "pointer",
                    fontWeight: selectedAdvocateFilter === adv.id ? 800 : 500,
                    background: selectedAdvocateFilter === adv.id ? "var(--accent-dim)" : "var(--surface)",
                    color: selectedAdvocateFilter === adv.id ? "var(--accent)" : "inherit",
                  }}
                >
                  ⚖️ {adv.name} ({adv.count})
                </button>
              ))}
            </div>
          )}

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
                ? "No messages received from advocates yet."
                : activeTab === "sent"
                ? "No messages sent by Admin yet."
                : "No messages match your criteria."}
            </div>
          )}

          {/* Messages Feed */}
          <div className="msg-thread" style={{ display: "grid", gap: 14 }}>
            {currentList.map((m) => {
              const fromAdvocate = isReceivedFromAdvocate(m);
              const senderDisplayName = getSenderDisplayName(m);

              return (
                <article
                  key={m.id}
                  className="msg-log-row messaging-message-card"
                  style={{
                    border: fromAdvocate ? "1.5px solid #C7D2FE" : "1px solid var(--line)",
                    background: fromAdvocate ? "#FAFBFF" : "var(--surface)",
                    borderRadius: 12,
                    padding: 18,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* Message Header with Clear Sender Indicator */}
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
                      {fromAdvocate ? (
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
                          ⚖️ SENDER: {senderDisplayName}
                        </span>
                      ) : (
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
                          🛡️ SENDER: Admin (You)
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
                        background: fromAdvocate ? "#FFFFFF" : "var(--surface-2)",
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
                      {fromAdvocate ? (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Sent to: <strong>Admin</strong>
                        </span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Delivered to:</span>
                          <NotificationStatus
                            recipientStatus={m.recipientStatus}
                            recipients={m.recipients}
                            lawyerNameOf={lawyerName}
                          />
                        </div>
                      )}
                    </div>

                    {fromAdvocate && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReply(m.senderId, senderDisplayName)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        title={`Reply directly to ${senderDisplayName}`}
                      >
                        <span>↩ Reply to {senderDisplayName}</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {individualTarget && (
        <MessageComposer
          lawyer={individualTarget}
          portalOnly={true}
          onClose={() => setIndividualTarget(null)}
          onSent={() => {
            showToast("Message sent.");
            reload();
          }}
        />
      )}

      {broadcastOpen && (
        <BroadcastComposer
          lawyers={lawyers.filter((l) => l.active)}
          onClose={() => setBroadcastOpen(false)}
          onSent={() => {
            showToast("Broadcast sent.");
            reload();
          }}
        />
      )}
    </>
  );
}
