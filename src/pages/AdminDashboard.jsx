import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Topbar from '../components/layout/Topbar.jsx';
import CaseStatus from '../components/cases/CaseStatus.jsx';
import { cases as casesApi, clients as clientsApi, lawyers as lawyersApi, tasks as tasksApi } from '../lib/api.js';
import { caseTypeByCode } from '../data/nomenclature.js';

export default function AdminDashboard() {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.allSettled([casesApi.list(), clientsApi.list(), lawyersApi.list(), tasksApi.listAll()])
      .then(([casesRes, clientsRes, lawyersRes, tasksRes]) => {
        if (!isMounted) return;
        if (casesRes.status === 'fulfilled') setCases(casesRes.value || []);
        if (clientsRes.status === 'fulfilled') setClients(clientsRes.value || []);
        if (lawyersRes.status === 'fulfilled') setLawyers(lawyersRes.value || []);
        if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value || []);
        
        if (casesRes.status === 'rejected' || clientsRes.status === 'rejected') {
          console.warn('Some API requests failed or timed out:', { casesRes, clientsRes, lawyersRes, tasksRes });
        }
      })
      .catch(err => {
        console.error('Failed to load dashboard data:', err);
        if (isMounted) setError('Failed to load data. Please refresh.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
  const lawyerMap = useMemo(() => new Map(lawyers.map(l => [l.id, l.name])), [lawyers]);

  const count = (status) => cases.filter(c => c.status === status).length;
  const clientName = (id) => clientMap.get(id) || '—';
  const lawyerName = (id) => lawyerMap.get(id) || 'Unassigned';

  const in3days = new Date(); in3days.setDate(in3days.getDate() + 3);
  const upcoming = tasks
    .filter(t => t.date && t.status !== 'Completed' && new Date(t.date) <= in3days)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 6);

  const recentCases = [...cases].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 6);

  return (
    <>
      <Topbar />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Dashboard</h1>
            <div className="sub">Firm-wide overview of cases, tasks, and lawyer workload.</div>
          </div>
          <Link to="/cases/new" className="btn btn-primary">+ New Client / Case</Link>
        </div>

        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <StatCard label="Total Cases" value={cases.length} sub={`${clients.length} clients on file`} />
          <StatCard label="Unassigned" value={count('Unassigned')} sub="Awaiting lawyer assignment" />
          <StatCard label="In Process" value={count('In Process')} sub="Actively being worked" />
          <StatCard label="Completed" value={count('Completed')} sub="Closed / resolved" />
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-head">
              <h3>Recent Cases</h3>
              <Link to="/cases" className="link">View all</Link>
            </div>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table>
                <thead><tr><th>Case ID</th><th>Client</th><th>Lawyer</th><th>Status</th></tr></thead>
                <tbody>
                  {recentCases.length === 0 && <tr className="empty-row"><td colSpan={4}>No cases yet.</td></tr>}
                  {recentCases.map(c => (
                    <tr key={c.id} className="clickable" onClick={() => window.location.assign(`/cases/${c.id}`)}>
                      <td className="mono">{c.caseId}</td>
                      <td>{clientName(c.clientId)}</td>
                      <td>{(c.assignedLawyerIds || []).length ? c.assignedLawyerIds.map(lawyerName).join(', ') : 'Unassigned'}</td>
                      <td><CaseStatus status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Upcoming &amp; Reminders (next 3 days)</h3>
              <Link to="/calendar" className="link">Open calendar</Link>
            </div>
            {upcoming.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}>Nothing due in the next 3 days.</div>}
            {upcoming.map(t => {
              const c = cases.find(c => c.id === t.caseId);
              return (
                <div key={t.id} className="msg-log-row" style={{ marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {c?.caseId} · {clientName(c?.clientId)} · {(t.assignedLawyerIds || []).length ? t.assignedLawyerIds.map(lawyerName).join(', ') : 'Unassigned'}
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 12 }}>{t.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
