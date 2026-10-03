import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Topbar from '../components/layout/Topbar.jsx';
import CaseStatus from '../components/cases/CaseStatus.jsx';
import TaskList from '../components/tasks/TaskList.jsx';
import DocumentManager from '../components/documents/DocumentManager.jsx';
import { cases as casesApi, clients as clientsApi, lawyers as lawyersApi, tasks as tasksApi } from '../lib/api.js';
import { caseTypeByCode } from '../data/nomenclature.js';
import { useApp } from '../context/AppContext.jsx';

import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';

export default function LawyerCaseView() {
  const { id } = useParams();
  const nav = useNavigate();
  const { showToast } = useApp();
  const [caseRecord, setCaseRecord] = useState(null);
  const [client, setClient] = useState(null);
  const [taskItems, setTaskItems] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const markedSeen = useRef(false);

  async function reload() {
    try {
      const c = await casesApi.get(id);
      if (!c) return;
      setCaseRecord(c);
      const [cl, ts, ls] = await Promise.all([clientsApi.get(c.clientId), tasksApi.listByCase(c.id), lawyersApi.list()]);
      setClient(cl); setTaskItems(ts); setLawyers(ls);

      // "Seen" — opening the case moves Delivered -> Seen, but never auto to In Process.
      if (c.status === 'Delivered' && !markedSeen.current) {
        markedSeen.current = true;
        const updated = await casesApi.setStatus(c.id, 'Seen');
        setCaseRecord(updated);
      }
    } catch (e) {
      console.warn('Failed to load lawyer case view:', e);
    }
  }
  useEffect(() => { reload(); }, [id]);

  if (!caseRecord) {
    return (
      <>
        <Topbar />
        <LoadingSpinner text="Hold on, Data is coming for you" />
      </>
    );
  }
  const type = caseTypeByCode(caseRecord.caseTypeCode);
  const lawyerName = (lawId) => lawyers.find(l => l.id === lawId)?.name || 'Unassigned';

  async function startWorking() {
    if (!window.confirm('Are you sure you want to start working on this case?')) return;
    const updated = await casesApi.setStatus(caseRecord.id, 'In Process');
    setCaseRecord(updated);
    showToast('Marked In Process.');
  }
  async function markCompleted() {
    if (!window.confirm('Are you sure you want to mark this whole case as completed?')) return;
    const updated = await casesApi.setStatus(caseRecord.id, 'Completed');
    setCaseRecord(updated);
    showToast('Case marked Completed.');
  }
  async function taskStatus(task, status) {
    if (status === 'Completed' && !window.confirm(`Are you sure you want to mark "${task.name}" as completed?`)) return;
    await tasksApi.setStatus(task.id, status);
    reload();
  }
  async function taskStartWorking(task) {
    if (!window.confirm(`Are you sure you want to start working on "${task.name}"?`)) return;
    await tasksApi.setStatus(task.id, 'In Process');
    reload();
  }

  return (
    <>
      <Topbar />
      <div className="page">
        <button className="link" onClick={() => nav('/portal')} style={{ fontSize: 12, marginBottom: 10, display: 'inline-block' }}>← My Cases</button>
        <div className="page-head">
          <div>
            <h1>{caseRecord.caseId} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 15 }}>· {client?.name}</span></h1>
            <div className="sub">{type?.label}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <CaseStatus status={caseRecord.status} />
            {caseRecord.status !== 'In Process' && caseRecord.status !== 'Completed' && (
              <button className="btn btn-primary" onClick={startWorking}>Start Working</button>
            )}
            {caseRecord.status === 'In Process' && (
              <button className="btn btn-ghost" onClick={markCompleted}>Mark Completed</button>
            )}
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Case Details</h3>
            <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
              <Row label="Matter" value={caseRecord.matter} />
              <Row label="Client Phone" value={client?.phone} />
              <Row label="Client Address" value={client?.address} />
              <Row label="Opening Date" value={caseRecord.openingDate} />
              <Row label="Notes" value={caseRecord.notes} />
            </div>
            <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Documents</div>
              <DocumentManager documents={caseRecord.documents || []} readOnly emptyLabel="No documents uploaded for this case yet." />
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Assigned Tasks</h3>
            <TaskList
              tasks={taskItems}
              mode="portal"
              lawyerNameOf={lawyerName}
              onStatusChange={taskStatus}
              onStartWorking={taskStartWorking}
              emptyLabel="No tasks assigned on this case yet."
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ textAlign: 'right', maxWidth: '65%' }}>{value || '—'}</span>
    </div>
  );
}
