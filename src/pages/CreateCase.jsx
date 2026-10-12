import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/layout/Topbar.jsx";
import ClientForm from "../components/clients/ClientForm.jsx";
import CaseForm from "../components/cases/CaseForm.jsx";
import MultiLawyerSelector from "../components/lawyers/MultiLawyerSelector.jsx";
import TaskList from "../components/tasks/TaskList.jsx";
import DocumentManager from "../components/documents/DocumentManager.jsx";
import SubmitProgress from "../components/ui/SubmitProgress.jsx";
import { useApp } from "../context/AppContext.jsx";
import {
  cases as casesApi,
  clients as clientsApi,
  tasks as tasksApi,
} from "../lib/api.js";

const emptyClient = { name: "", phone: "", email: "", address: "", notes: "" };
const emptyCase = {
  caseTypeCode: "",
  ourRef: "",
  matter: "",
  openingDate: new Date().toISOString().slice(0, 10),
  closingDate: "",
  feeAgreed: "",
  piFields: {},
  notes: "",
};
const newTask = () => ({
  name: "",
  date: "",
  assignedLawyerIds: [],
  notes: "",
  attachments: [],
});

export default function CreateCase() {
  const nav = useNavigate();
  const { showToast } = useApp();

  const [clientMode, setClientMode] = useState("new"); // 'new' | 'existing'
  const [existingClients, setExistingClients] = useState([]);
  const [existingClientId, setExistingClientId] = useState("");
  const [client, setClient] = useState(emptyClient);

  const [caseDraft, setCaseDraft] = useState(emptyCase);
  const [assignNow, setAssignNow] = useState(false);
  const [lawyerIds, setLawyerIds] = useState([]);
  const [taskDraft, setTaskDraft] = useState(false);
  const [taskList, setTaskList] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    clientsApi.list().then(setExistingClients);
  }, []);

  function validate() {
    const e = {};
    if (clientMode === "new") {
      if (!client.name.trim()) e.name = "Client name is required.";
      if (!client.phone.trim()) e.phone = "Phone number is required.";
    } else if (!existingClientId) {
      e.client = "Select an existing client.";
    }
    if (!caseDraft.caseTypeCode) e.caseTypeCode = "Select a case type.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      let clientId = existingClientId;
      if (clientMode === "new") {
        const created = await clientsApi.create(client);
        clientId = created.id;
      }
      const draftTasks = taskList.filter((t) => t.name.trim());
      const res = await casesApi.create({
        ...caseDraft,
        clientId,
        assignedLawyerIds: assignNow ? lawyerIds : [],
        documents,
        tasks: [],
      });
      const created = res?.case || res;

      const taskErrors = [];
      for (const task of draftTasks) {
        try {
          await tasksApi.create({ ...task, caseId: created.id });
        } catch (error) {
          taskErrors.push(`${task.name}: ${error.message}`);
        }
      }

      if (taskErrors.length) {
        showToast(
          `Case created, but some tasks or attachments failed: ${taskErrors.join("; ")}`,
          "error",
        );
      } else {
        showToast(`Case ${created?.caseId || ""} created.`);
      }
      if (created?.id) {
        nav(`/cases/${created.id}`);
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar />
      <div className="page" style={{ maxWidth: 780 }}>
        <div className="page-head">
          <div>
            <h1>New Client / Case</h1>
            <div className="sub">
              Create a client and open a case/file in one flow.
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>1. Client</h3>
          <div className="section-hint">
            Use an existing client, or create a new one below.
          </div>
          <div className="radio-pair" style={{ marginBottom: 16 }}>
            <button
              type="button"
              className={`radio-opt${clientMode === "new" ? " active" : ""}`}
              onClick={() => setClientMode("new")}
            >
              New Client
            </button>
            <button
              type="button"
              className={`radio-opt${clientMode === "existing" ? " active" : ""}`}
              onClick={() => setClientMode("existing")}
            >
              Existing Client
            </button>
          </div>
          {clientMode === "existing" && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Select Client</label>
              <select
                value={existingClientId}
                onChange={(e) => setExistingClientId(e.target.value)}
              >
                <option value="">Choose a client…</option>
                {existingClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
              {errors.client && <div className="err-text">{errors.client}</div>}
            </div>
          )}
        </div>

        {clientMode === "new" && (
          <ClientForm value={client} onChange={setClient} errors={errors} />
        )}

        <CaseForm
          value={caseDraft}
          onChange={setCaseDraft}
          caseIdPreview={
            caseDraft.caseTypeCode
              ? `${caseDraft.caseTypeCode}-0xx (assigned on save)`
              : ""
          }
          errors={errors}
        />

        <div className="form-section">
          <h3>2. Advocate Assignment</h3>
          <div className="section-hint">
            Optional — a case can be assigned to one or more advocates now, or
            left unassigned and assigned later.
          </div>
          <div
            className="radio-pair"
            style={{ marginBottom: assignNow ? 16 : 0 }}
          >
            <button
              type="button"
              className={`radio-opt${assignNow ? " active" : ""}`}
              onClick={() => setAssignNow(true)}
            >
              Yes, assign now
            </button>
            <button
              type="button"
              className={`radio-opt${!assignNow ? " active" : ""}`}
              onClick={() => {
                setAssignNow(false);
                setLawyerIds([]);
              }}
            >
              No, leave unassigned
            </button>
          </div>
          {assignNow && (
            <MultiLawyerSelector value={lawyerIds} onChange={setLawyerIds} />
          )}
        </div>

        <div className="form-section">
          <h3>3. Tasks</h3>
          <div className="section-hint">
            Optional — add hearings, submissions, or meetings now, or later from
            the case page.
          </div>
          {!taskDraft && taskList.length === 0 ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setTaskDraft(true);
                setTaskList([newTask()]);
              }}
            >
              + Add a Task
            </button>
          ) : (
            <TaskList
              tasks={taskList}
              mode="draft"
              onChange={(i, t) =>
                setTaskList((list) => list.map((x, idx) => (idx === i ? t : x)))
              }
              onRemove={(i) =>
                setTaskList((list) => list.filter((_, idx) => idx !== i))
              }
              onAdd={() => setTaskList((list) => [...list, newTask()])}
            />
          )}
        </div>

        <div className="form-section">
          <h3>4. Documents</h3>
          <div className="section-hint">
            Optional — create folders and upload files now, or add them anytime
            later from the case page.
          </div>
          <DocumentManager documents={documents} onChange={setDocuments} />
        </div>

        <div className="modal-actions" style={{ justifyContent: "flex-start" }}>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Client / Case"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => nav(-1)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
        {saving && <SubmitProgress label="Creating your case…" />}
      </div>
    </>
  );
}
