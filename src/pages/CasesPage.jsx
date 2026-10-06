import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Topbar from "../components/layout/Topbar.jsx";
import CaseStatus from "../components/cases/CaseStatus.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import {
  cases as casesApi,
  clients as clientsApi,
  lawyers as lawyersApi,
} from "../lib/api.js";
import { caseTypeByCode, CASE_STATUSES } from "../data/nomenclature.js";

export default function CasesPage() {
  const nav = useNavigate();
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([casesApi.list(), clientsApi.list(), lawyersApi.list()])
      .then(([c, cl, l]) => {
        setCases(c);
        setClients(cl);
        setLawyers(l);
      })
      .finally(() => setLoading(false));
  }, []);

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients],
  );
  const lawyerMap = useMemo(
    () => new Map(lawyers.map((l) => [l.id, l.name])),
    [lawyers],
  );

  const clientName = (id) => clientMap.get(id) || "—";
  const lawyerName = (id) => lawyerMap.get(id) || "Unassigned";

  const rows = useMemo(() => {
    let r = cases;
    if (statusFilter === "all") {
      r = r.filter((c) => c.status !== "Archived");
    } else if (statusFilter === "Completed") {
      r = r.filter((c) => c.status === "Completed" || c.status === "Archived");
    } else {
      r = r.filter((c) => c.status === statusFilter);
    }
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (c) =>
          (c?.caseId || "").toLowerCase().includes(qq) ||
          clientName(c?.clientId).toLowerCase().includes(qq) ||
          (c?.matter || "").toLowerCase().includes(qq),
      );
    }
    return [...r].sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || ""),
    );
  }, [cases, q, statusFilter, clientMap]);

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
            <h1>Cases</h1>
            <div className="sub">
              {cases.length} case{cases.length === 1 ? "" : "s"} on file.
            </div>
          </div>
          <Link to="/cases/new" className="btn btn-primary">
            + New Client / Case
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <input
            placeholder="Search by Case ID, client, or matter…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              flex: 1,
              minWidth: 240,
              background: "var(--surface-2)",
              border: "1.5px solid var(--line)",
              color: "var(--text)",
              padding: "10px 13px",
              borderRadius: 9,
              fontSize: 13.5,
            }}
          />
        </div>
        <div className="chip-row">
          <button
            className={`chip${statusFilter === "all" ? " active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>
          {CASE_STATUSES.map((s) => (
            <button
              key={s}
              className={`chip${statusFilter === s ? " active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Client</th>
                <th>Type</th>
                <th>Advocate</th>
                <th>Opened</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={6}>No cases match this view.</td>
                </tr>
              )}
              {rows.map((c) => {
                const type = caseTypeByCode(c.caseTypeCode);
                return (
                  <tr
                    key={c.id}
                    className="clickable"
                    onClick={() => nav(`/cases/${c.id}`)}
                  >
                    <td className="mono" style={{ fontWeight: 700 }}>
                      {c.caseId}
                    </td>
                    <td>{clientName(c.clientId)}</td>
                    <td>
                      {type && (
                        <span className={`folder-chip ${type.color}`}>
                          {type.code}
                        </span>
                      )}
                    </td>
                    <td>
                      {(c.assignedLawyerIds || []).length
                        ? c.assignedLawyerIds.map(lawyerName).join(", ")
                        : "Unassigned"}
                    </td>
                    <td className="mono">
                      {c.openingDate ? String(c.openingDate).slice(0, 10) : "—"}
                    </td>
                    <td>
                      <CaseStatus status={c.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
