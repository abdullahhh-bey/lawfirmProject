import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Topbar from "../components/layout/Topbar.jsx";
import CaseStatus from "../components/cases/CaseStatus.jsx";
import {
  cases as casesApi,
  clients as clientsApi,
  lawyers as lawyersApi,
  tasks as tasksApi,
} from "../lib/api.js";
import { caseTypeByCode } from "../data/nomenclature.js";

import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";

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
    Promise.allSettled([
      casesApi.list(),
      clientsApi.list(),
      lawyersApi.list(),
      tasksApi.listAll(),
    ])
      .then(([casesRes, clientsRes, lawyersRes, tasksRes]) => {
        if (!isMounted) return;
        if (casesRes.status === "fulfilled") setCases(casesRes.value || []);
        if (clientsRes.status === "fulfilled")
          setClients(clientsRes.value || []);
        if (lawyersRes.status === "fulfilled")
          setLawyers(lawyersRes.value || []);
        if (tasksRes.status === "fulfilled") setTasks(tasksRes.value || []);

        if (
          casesRes.status === "rejected" ||
          clientsRes.status === "rejected"
        ) {
          console.warn("Some API requests failed or timed out:", {
            casesRes,
            clientsRes,
            lawyersRes,
            tasksRes,
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err);
        if (isMounted) setError("Failed to load data. Please refresh.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients],
  );
  const lawyerMap = useMemo(
    () => new Map(lawyers.map((l) => [l.id, l.name])),
    [lawyers],
  );

  const count = (status) =>
    cases.filter(
      (c) =>
        c.status === status ||
        (status === "Completed" && c.status === "Archived"),
    ).length;
  const clientName = (id) => clientMap.get(id) || "—";
  const lawyerName = (id) => lawyerMap.get(id) || "Unassigned";

  const in3days = new Date();
  in3days.setDate(in3days.getDate() + 3);
  const finishedCaseIds = new Set(
    cases
      .filter((c) => c.status === "Archived" || c.status === "Completed")
      .map((c) => c.id),
  );
  const upcoming = tasks
    .filter(
      (t) =>
        t.date &&
        t.status !== "Completed" &&
        !finishedCaseIds.has(t.caseId) &&
        new Date(t.date) <= in3days,
    )
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .slice(0, 6);

  const recentCases = [...cases]
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .slice(0, 6);

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
      <main className="page dashboard-page">
        <div className="dashboard-hero">
          <div>
            <div className="dashboard-eyebrow">PLUG SOLICITORS</div>
            <h1>Firm overview</h1>
            <div className="sub">
              Firm-wide overview of cases, tasks, and advocate workload.
            </div>
          </div>
          <Link to="/cases/new" className="btn btn-primary dashboard-create">
            <span aria-hidden="true">+</span>
            New Client / Case
          </Link>
        </div>

        <div className="grid grid-4 dashboard-stats">
          <StatCard
            label="Total Cases"
            value={cases.length}
            sub={`${clients.length} clients on file`}
          />
          <StatCard
            label="Unassigned"
            value={count("Unassigned")}
            sub="Awaiting advocate assignment"
          />
          <StatCard
            label="In Process"
            value={count("In Process")}
            sub="Actively being worked"
          />
          <StatCard
            label="Completed"
            value={count("Completed")}
            sub="Closed / resolved"
          />
        </div>

        <div className="dashboard-columns">
          <section className="dashboard-panel dashboard-recent">
            <div className="dashboard-section-head">
              <div>
                <div className="dashboard-section-kicker">CASE ACTIVITY</div>
                <h2>Recent cases</h2>
              </div>
              <Link to="/cases" className="link">
                View all
              </Link>
            </div>
            <div className="table-wrap dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Client</th>
                    <th>Advocate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={4}>No cases yet.</td>
                    </tr>
                  )}
                  {recentCases.map((c) => (
                    <tr
                      key={c.id}
                      className="clickable"
                      onClick={() => window.location.assign(`/cases/${c.id}`)}
                    >
                      <td className="mono">{c.caseId}</td>
                      <td>{clientName(c.clientId)}</td>
                      <td>
                        {(c.assignedLawyerIds || []).length
                          ? c.assignedLawyerIds.map(lawyerName).join(", ")
                          : "Unassigned"}
                      </td>
                      <td>
                        <CaseStatus status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dashboard-panel dashboard-upcoming">
            <div className="dashboard-section-head">
              <div>
                <div className="dashboard-section-kicker">PRIORITY WORK</div>
                <h2>Due soon</h2>
                <p>Upcoming tasks and reminders · next 3 days</p>
              </div>
              <Link to="/calendar" className="link">
                Open calendar
              </Link>
            </div>
            {upcoming.length === 0 && (
              <div className="dashboard-empty">
                Nothing due in the next 3 days.
              </div>
            )}
            {upcoming.map((t) => {
              const c = cases.find((c) => c.id === t.caseId);
              return (
                <div key={t.id} className="dashboard-reminder">
                  <div className="dashboard-reminder-main">
                    <div className="dashboard-reminder-name">{t.name}</div>
                    <div className="dashboard-reminder-meta">
                      {c?.caseId} · {clientName(c?.clientId)} ·{" "}
                      {(t.assignedLawyerIds || []).length
                        ? t.assignedLawyerIds.map(lawyerName).join(", ")
                        : "Unassigned"}
                    </div>
                  </div>
                  <span className="dashboard-reminder-date">{t.date}</span>
                </div>
              );
            })}
          </section>
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="dashboard-stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
