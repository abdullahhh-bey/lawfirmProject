import React, { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar.jsx";
import MessageComposer from "../components/messaging/MessageComposer.jsx";
import BroadcastComposer from "../components/messaging/BroadcastComposer.jsx";
import NotificationStatus from "../components/messaging/NotificationStatus.jsx";
import AttachmentList from "../components/ui/AttachmentList.jsx";
import { lawyers as lawyersApi, messaging } from "../lib/api.js";
import { useApp } from "../context/AppContext.jsx";

export default function MessagingPage() {
  const { showToast } = useApp();
  const [lawyers, setLawyers] = useState([]);
  const [log, setLog] = useState([]);
  const [individualTarget, setIndividualTarget] = useState(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  function reload() {
    Promise.all([lawyersApi.list(), messaging.list()]).then(([l, m]) => {
      setLawyers(l);
      setLog(m);
    });
  }
  useEffect(reload, []);

  const lawyerName = (id) =>
    lawyers.find((l) => (l.id || "").toLowerCase() === (id || "").toLowerCase())
      ?.name || id;

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
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Messaging</h1>
            <div className="sub">
              Send individual or broadcast messages and reminders to advocates.
            </div>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Individual Message</h3>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 12.5,
                marginBottom: 14,
              }}
            >
              Select one advocate and send a custom message.
            </div>
            <select
              defaultValue=""
              onChange={(e) => {
                const l = lawyers.find((x) => x.id === e.target.value);
                if (l) setIndividualTarget(l);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Choose an advocate…
              </option>
              {lawyers
                .filter((l) => l.active)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Group / Broadcast Message</h3>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 12.5,
                marginBottom: 14,
              }}
            >
              Select multiple advocates and send the same message to all of
              them.
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setBroadcastOpen(true)}
            >
              Compose Broadcast
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Message Log</h3>
          {log.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              No messages sent yet.
            </div>
          )}
          <div className="msg-thread">
            {log.map((m) => (
              <div
                key={m.id}
                className="msg-log-row"
                style={{
                  alignItems: "flex-start",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <span
                    className="chip"
                    style={{ textTransform: "capitalize" }}
                  >
                    {m.type}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
                {m.text && <div style={{ fontSize: 13 }}>{m.text}</div>}
                <AttachmentList
                  attachments={m.attachments}
                  compact
                  onDownload={downloadAttachment}
                />
                <NotificationStatus
                  recipientStatus={m.recipientStatus}
                  lawyerNameOf={lawyerName}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {individualTarget && (
        <MessageComposer
          lawyer={individualTarget}
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
