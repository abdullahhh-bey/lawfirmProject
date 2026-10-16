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
      <div className="page messaging-page">
        <div className="page-head">
          <div>
            <h1>Messaging</h1>
            <div className="sub">
              Send individual or broadcast messages and reminders to advocates.
            </div>
          </div>
        </div>

        <div className="grid grid-2 messaging-compose-options">
          <section className="card messaging-option-card">
            <div className="messaging-option-icon" aria-hidden="true">↗</div>
            <h2>Individual Message</h2>
            <p>
              Select one advocate and send a custom message.
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
          </section>
          <section className="card messaging-option-card">
            <div className="messaging-option-icon" aria-hidden="true">◎</div>
            <h2>Group / Broadcast Message</h2>
            <p>
              Select multiple advocates and send the same message to all of
              them.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setBroadcastOpen(true)}
            >
              Compose Broadcast
            </button>
          </section>
        </div>

        <section className="card messaging-log-card">
          <div className="messaging-log-heading">
            <div>
              <h2>Message Log</h2>
              <p>Recent messages sent to advocates.</p>
            </div>
            <span className="messaging-count">{log.length} {log.length === 1 ? "message" : "messages"}</span>
          </div>
          {log.length === 0 && (
            <div className="messaging-empty">
              No messages sent yet.
            </div>
          )}
          <div className="msg-thread">
            {log.map((m) => (
              <article
                key={m.id}
                className="msg-log-row messaging-message-card"
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
                <NotificationStatus
                  recipientStatus={m.recipientStatus}
                  lawyerNameOf={lawyerName}
                />
              </article>
            ))}
          </div>
        </section>
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
