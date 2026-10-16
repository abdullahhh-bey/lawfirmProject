import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Topbar from "../components/layout/Topbar.jsx";
import ClientDetails from "../components/clients/ClientDetails.jsx";
import CaseDetails from "../components/cases/CaseDetails.jsx";
import TaskList from "../components/tasks/TaskList.jsx";
import Calendar from "../components/calendar/Calendar.jsx";
import MessageComposer from "../components/messaging/MessageComposer.jsx";
import NotificationStatus from "../components/messaging/NotificationStatus.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import SubmitProgress from "../components/ui/SubmitProgress.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import {
  cases as casesApi,
  clients as clientsApi,
  lawyers as lawyersApi,
  tasks as tasksApi,
  notifications as notificationsApi,
  finance as financeApi,
} from "../lib/api.js";
import { caseTypeByCode } from "../data/nomenclature.js";
import { useApp } from "../context/AppContext.jsx";

const newTask = () => ({
  name: "",
  date: "",
  assignedLawyerIds: [],
  notes: "",
  attachments: [],
});

export default function CaseDetailsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { showToast, session } = useApp();

  const [caseRecord, setCaseRecord] = useState(null);
  const [client, setClient] = useState(null);
  const [lawyers, setLawyers] = useState([]);
  const [taskItems, setTaskItems] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [feeReceived, setFeeReceived] = useState(0);
  const [tab, setTab] = useState("overview");
  const [composerFor, setComposerFor] = useState(null);
  const [draftTask, setDraftTask] = useState(null);
  const [savingTask, setSavingTask] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);

  const isAdmin = session?.role === "admin";
  const historyReturnPath = location.state?.returnTo;
  const backPath =
    typeof historyReturnPath === "string" &&
    /^\/clients\/[^/]+\/history$/.test(historyReturnPath)
      ? historyReturnPath
      : "/cases";

  async function reload() {
    setLoading(true);
    try {
      const c = await casesApi.get(id);
      if (!c) return;
      setCaseRecord(c);
      const [cl, ls, ts, ns] = await Promise.all([
        clientsApi.get(c.clientId),
        lawyersApi.list(),
        tasksApi.listByCase(c.id),
        notificationsApi.list(),
      ]);
      setClient(cl);
      setLawyers(ls);
      setTaskItems(ts);
      setNotifs(ns.filter((n) => n.caseId === c.id));
      if (cl) {
        const ledger = await financeApi.listForClient(cl.id);
        const receivedForCase = ledger
          .filter(
            (r) => r.caseId === c.id && (r.account || "office") === "office",
          )
          .reduce((s, r) => s + (r.type === "OUT" ? -r.amount : r.amount), 0);
        setFeeReceived(receivedForCase);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, [id]);

  if (loading || !caseRecord) {
    return (
      <>
        <Topbar />
        <LoadingSpinner text="Hold on, Data is coming for you" />
      </>
    );
  }

  const lawyerName = (lawId) => {
    const found = lawyers.find(
      (l) => (l.id || "").toLowerCase() === (lawId || "").toLowerCase(),
    );
    if (found?.name) return found.name;
    const idx = (caseRecord?.assignedLawyerIds || []).findIndex(
      (id) => (id || "").toLowerCase() === (lawId || "").toLowerCase(),
    );
    if (idx !== -1 && caseRecord?.assignedLawyerNames?.[idx])
      return caseRecord.assignedLawyerNames[idx];
    return "Advocate";
  };

  async function reassign(newLawyerIds) {
    try {
      const updated = await casesApi.assignLawyers(caseRecord.id, newLawyerIds);
      setCaseRecord(updated);
      showToast(
        "Advocate assignment updated — notifications queued for anyone newly added.",
      );
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function updateLegacyCaseId(legacyCaseId) {
    try {
      const updated = await casesApi.updateLegacyCaseId(caseRecord.id, legacyCaseId);
      setCaseRecord(updated);
      showToast("Previous case ID updated.");
    } catch (error) {
      throw new Error(error.message || "Could not update the previous case ID.");
    }
  }

  async function updateTaskStatus(task, status) {
    try {
      const updated = await tasksApi.setStatus(task.id, status);
      setTaskItems((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function removeTask(_, task) {
    try {
      await tasksApi.remove(task.id);
      setTaskItems((prev) => prev.filter((t) => t.id !== task.id));
      showToast("Task removed.");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function saveDraftTask() {
    if (!draftTask.name.trim() || savingTask) return;
    setSavingTask(true);
    try {
      const created = await tasksApi.create({
        ...draftTask,
        caseId: caseRecord.id,
      });
      setTaskItems((prev) => [created, ...prev]);
      setDraftTask(null);
      showToast("Task added.");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSavingTask(false);
    }
  }

  async function addTaskAttachments(task, files) {
    if (!files.length) return;
    try {
      const updated = await tasksApi.addAttachments(task.id, files);
      setTaskItems((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      showToast("File attached to task.");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function updateDocuments(newTree) {
    setCaseRecord((cr) => ({ ...cr, documents: newTree }));
    try {
      await casesApi.setDocuments(caseRecord.id, newTree);
    } catch (e) {
      showToast(e.message, "error");
      reload();
    }
  }

  async function archiveCase() {
    function countFiles(nodes) {
      return (nodes || []).reduce(
        (s, n) => s + (n.kind === "folder" ? countFiles(n.children) : 1),
        0,
      );
    }
    const docCount = countFiles(caseRecord.documents);
    const warn = `Archive case ${caseRecord.caseId}? This will download a summary package with ${docCount} document(s) and move the case to the Archived section.`;
    if (!window.confirm(warn)) return;
    setArchiving(true);
    try {
      const { downloadCaseArchive } = await import("../lib/archive.js");
      const type = caseTypeByCode(caseRecord.caseTypeCode);
      const lawyerNames = (caseRecord.assignedLawyerIds || []).map(lawyerName);
      await downloadCaseArchive({
        caseRecord,
        client,
        typeLabel: type?.label || caseRecord.caseTypeCode,
        lawyerNames,
        feeReceived,
      });
      const updated = await casesApi.setStatus(caseRecord.id, "Archived");
      setCaseRecord(updated);
      showToast(`Case ${caseRecord.caseId} moved to Archived.`);
    } catch (e) {
      showToast(e.message || "Could not archive this case.", "error");
    } finally {
      setArchiving(false);
    }
  }

  async function confirmCancelCase() {
    try {
      const updated = await casesApi.setStatus(caseRecord.id, "Cancelled");
      setCaseRecord(updated);
      showToast(`Case ${caseRecord.caseId} status changed to Cancelled.`);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setConfirmAction(null);
    }
  }

  async function confirmDeleteCase() {
    try {
      await casesApi.remove(caseRecord.id);
      showToast(`Case ${caseRecord.caseId} permanently deleted.`);
      nav("/cases");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setConfirmAction(null);
    }
  }

  return (
    <>
      <Topbar />
      <div className="page">
        <div className="page-head">
          <div>
            <button
              className="link back-link"
              onClick={() => nav(backPath)}
              style={{ fontSize: 12, marginBottom: 6, display: "inline-block" }}
            >
              {backPath === "/cases" ? "← All Cases" : "← Client History"}
            </button>
            <h1>
              {caseRecord.caseId}{" "}
              {caseRecord.legacyCaseId && (
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--accent)",
                    fontWeight: 600,
                    marginRight: 6,
                  }}
                  title="Previous Case ID"
                >
                  (Prev: {caseRecord.legacyCaseId})
                </span>
              )}
              <span
                style={{
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  fontSize: 15,
                }}
              >
                · {client?.name}
              </span>
            </h1>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {(caseRecord.assignedLawyerIds || []).length > 0 &&
              caseRecord.assignedLawyerIds.map((lawId) => (
                <button
                  key={lawId}
                  className="btn btn-ghost"
                  onClick={() => {
                    const target = lawyers.find(
                      (l) =>
                        (l.id || "").toLowerCase() ===
                        (lawId || "").toLowerCase(),
                    ) || { id: lawId, name: lawyerName(lawId) };
                    setComposerFor(target);
                  }}
                >
                  Message {lawyerName(lawId)}
                </button>
              ))}
            {caseRecord.status !== "Cancelled" && (
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmAction({ type: "cancel" })}
              >
                Cancel Case
              </button>
            )}
            {caseRecord.status !== "Archived" && (
              <button
                className="btn btn-warning"
                onClick={archiveCase}
                disabled={archiving}
              >
                {archiving ? "Archiving…" : "Archive Case"}
              </button>
            )}
            {isAdmin && (
              <button
                className="btn btn-danger"
                onClick={() => setConfirmAction({ type: "delete" })}
              >
                Delete Case
              </button>
            )}
          </div>
        </div>

        <div className="tabs">
          {["overview", "tasks", "calendar", "communication"].map((t) => (
            <button
              key={t}
              className={`tab${tab === t ? " active" : ""}`}
              onClick={() => setTab(t)}
              style={{ textTransform: "capitalize" }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid grid-2">
            <ClientDetails client={client} />
            <CaseDetails
              caseRecord={caseRecord}
              onReassign={reassign}
              onDocumentsChange={updateDocuments}
              feeReceived={feeReceived}
              clientId={client?.id}
              isAdmin={isAdmin}
              onSaveLegacyCaseId={updateLegacyCaseId}
            />
          </div>
        )}

        {tab === "tasks" && (
          <div className="card">
            <div className="card-head">
              <h3>Tasks</h3>
              {!draftTask && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDraftTask(newTask())}
                >
                  + Add Task
                </button>
              )}
            </div>
            {draftTask && (
              <div style={{ marginBottom: 12 }}>
                <TaskList
                  tasks={[draftTask]}
                  mode="draft"
                  onChange={(_, t) => setDraftTask(t)}
                  onRemove={() => setDraftTask(null)}
                  onAdd={() => {}}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={saveDraftTask}
                  disabled={savingTask}
                >
                  {savingTask ? "Saving…" : "Save Task"}
                </button>
                {savingTask && <SubmitProgress label="Saving task…" />}
              </div>
            )}
            <TaskList
              tasks={taskItems}
              mode="full"
              lawyerNameOf={lawyerName}
              onStatusChange={updateTaskStatus}
              onRemove={removeTask}
              onAddAttachments={addTaskAttachments}
              emptyLabel="No tasks on this case yet."
            />
          </div>
        )}

        {tab === "calendar" && (
          <Calendar
            tasks={taskItems}
            caseMetaFor={() => ({
              caseId: caseRecord.caseId,
              status: caseRecord.status,
            })}
          />
        )}

        {tab === "communication" && (
          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Assignment Notifications</h3>
            {notifs.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                No notifications sent for this case yet.
              </div>
            )}
            {notifs.map((n) => (
              <div
                key={n.id}
                className="msg-log-row"
                style={{ marginBottom: 8, alignItems: "flex-start" }}
              >
                <div style={{ whiteSpace: "pre-line", fontSize: 12.5 }}>
                  {n.message}
                </div>
                <NotificationStatus
                  recipientStatus={{ [n.lawyerId]: n.status }}
                  lawyerNameOf={lawyerName}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {composerFor && (
        <MessageComposer
          lawyer={composerFor}
          onClose={() => setComposerFor(null)}
          onSent={() => showToast("Message sent.")}
        />
      )}

      {confirmAction?.type === "delete" && (
        <ConfirmDialog
          activity="DELETING CASE"
          title={`Permanently delete case ${caseRecord.caseId}?`}
          message="Are you sure you want to delete this case? All associated tasks, records, and linked files will be permanently erased."
          confirmLabel="Yes, Delete Case"
          cancelLabel="No, Keep Case"
          danger
          variant="danger"
          details={[
            { label: "Case ID", value: caseRecord.caseId, mono: true },
            ...(caseRecord.legacyCaseId
              ? [{ label: "Previous Case ID", value: caseRecord.legacyCaseId, mono: true }]
              : []),
            { label: "Client", value: client?.name || "—" },
            { label: "Matter", value: caseRecord.matter || "—" },
          ]}
          impactNotes={[
            "This action cannot be undone.",
            "Case data, timeline, and task history will be permanently deleted.",
          ]}
          onConfirm={confirmDeleteCase}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction?.type === "cancel" && (
        <ConfirmDialog
          activity="CANCELLING CASE"
          title={`Cancel case ${caseRecord.caseId}?`}
          message="Are you sure you want to cancel this case? The case status will be set to Cancelled, but all records will remain safely in the system."
          confirmLabel="Yes, Cancel Case"
          cancelLabel="No, Keep Active"
          variant="warning"
          details={[
            { label: "Case ID", value: caseRecord.caseId, mono: true },
            { label: "Client", value: client?.name || "—" },
            { label: "Current Status", value: caseRecord.status },
          ]}
          impactNotes={[
            "Status will be marked as Cancelled.",
            "Documents, tasks, and history are preserved.",
          ]}
          onConfirm={confirmCancelCase}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
