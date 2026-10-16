import React, { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar.jsx";
import Modal from "../components/ui/Modal.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import SubmitProgress from "../components/ui/SubmitProgress.jsx";
import LawyerList from "../components/lawyers/LawyerList.jsx";
import MessageComposer from "../components/messaging/MessageComposer.jsx";
import {
  lawyers as lawyersApi,
  cases as casesApi,
  tasks as tasksApi,
} from "../lib/api.js";
import { useApp } from "../context/AppContext.jsx";

import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";

const emptyLawyer = { name: "", email: "", phone: "", password: "" };

export default function LawyersPage() {
  const { showToast } = useApp();
  const [lawyers, setLawyers] = useState([]);
  const [cases, setCases] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    Promise.all([lawyersApi.list(), casesApi.list(), tasksApi.listAll()])
      .then(([l, c, t]) => {
        setLawyers(l);
        setCases(c);
        setTasks(t);
      })
      .finally(() => setLoading(false));
  }
  useEffect(reload, []);

  function openEdit(lawyer) {
    setEditing(lawyer);
    setDraft(lawyer ? { ...lawyer } : { ...emptyLawyer });
  }

  // Fix: previously only `editing` was cleared, leaving `draft` set so the
  // modal (rendered on `{draft && ...}`) never actually closed.
  function closeModal() {
    if (saving) return;
    setEditing(null);
    setDraft(null);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing?.id) {
        const updated = await lawyersApi.update(editing.id, draft);
        setLawyers((prev) =>
          prev.map((l) => (l.id === updated.id ? updated : l)),
        );
        showToast("Advocate updated.");
      } else {
        if (!draft.name.trim() || !draft.email.trim()) {
          showToast("Name and email are required.", "error");
          setSaving(false);
          return;
        }
        const created = await lawyersApi.create(draft);
        setLawyers((prev) => [...prev, created]);
        showToast("Advocate account created.");
      }
      closeModal();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(lawyer) {
    try {
      const updated = await lawyersApi.toggleActive(lawyer.id);
      setLawyers((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l)),
      );
      showToast(
        lawyer.active ? "Advocate deactivated." : "Advocate activated.",
      );
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function confirmDelete() {
    try {
      await lawyersApi.remove(deleteTarget.id);
      setLawyers((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      showToast("Advocate account deleted.");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar />
        <LoadingSpinner text="Hold on, Data is coming for you" />
      </>
    );
  }

  return (
    <>
      <Topbar />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Advocates</h1>
            <div className="sub">Manage advocate accounts and workload.</div>
          </div>
          <button className="btn btn-primary" onClick={() => openEdit(null)}>
            + New Advocate Account
          </button>
        </div>
        <LawyerList
          lawyers={lawyers}
          cases={cases}
          tasks={tasks}
          onEdit={openEdit}
          onToggleActive={toggleActive}
          onMessage={setMessageTarget}
          onDelete={setDeleteTarget}
        />
      </div>

      {draft && (
        <Modal
          title={editing?.id ? "Edit Advocate" : "New Advocate Account"}
          onClose={closeModal}
          maxWidth="460px"
        >
          <div className="field">
            <label>Full Name</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Email (login)</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Phone (for WhatsApp)</label>
              <input
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </div>
          </div>
          {!editing?.id && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Temporary Password</label>
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={draft.password}
                onChange={(e) =>
                  setDraft({ ...draft, password: e.target.value })
                }
              />
              <div className="field-hint">
                In production this should be a secure, forced-reset invite — not
                a plain-text default.
              </div>
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {saving && <SubmitProgress label="Saving advocate account…" />}
        </Modal>
      )}

      {messageTarget && (
        <MessageComposer
          lawyer={messageTarget}
          onClose={() => setMessageTarget(null)}
          onSent={() => showToast("Message sent.")}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          activity="DELETING ADVOCATE"
          title={`Remove advocate ${deleteTarget.name}?`}
          message="Are you sure you want to delete this advocate account? They will lose access to the portal immediately."
          confirmLabel="Yes, Delete Advocate"
          cancelLabel="No, Keep Advocate"
          danger
          variant="danger"
          details={[
            { label: "Advocate Name", value: deleteTarget.name },
            { label: "Email", value: deleteTarget.email },
            ...(deleteTarget.phone
              ? [{ label: "Phone", value: deleteTarget.phone }]
              : []),
          ]}
          impactNotes={[
            "This action cannot be undone.",
            "Assigned cases will automatically revert to Unassigned.",
            "They will be unassigned from all pending tasks.",
          ]}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
