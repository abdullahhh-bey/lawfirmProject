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
import { formatDateOnly } from "../lib/dateUtils.js";

export default function CasesPage() {
  const nav = useNavigate();
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [advocateFilter, setAdvocateFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([casesApi.list(), clientsApi.list(), lawyersApi.list()])
      .then(([c, cl, l]) => {
        setCases(c || []);
        setClients(cl || []);
        setLawyers(l || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );
  const lawyerMap = useMemo(
    () => new Map(lawyers.map((l) => [l.id, l.name])),
    [lawyers],
  );

  const getClient = (id) => clientMap.get(id);
  const getClientName = (id) => clientMap.get(id)?.name || "—";
  const lawyerName = (id) => lawyerMap.get(id) || "Advocate";

  const caseTypeOptions = useMemo(() => {
    const seen = new Set();
    return [...new Set(cases.map((c) => c.caseTypeCode))]
      .map((code) => ({ code, ...caseTypeByCode(code) }))
      .filter((entry) => entry && !seen.has(entry.code) && seen.add(entry.code));
  }, [cases]);

  // Statistics
  const stats = useMemo(() => {
    const active = cases.filter((c) => c.status !== "Archived" && c.status !== "Cancelled");
    const inProcess = cases.filter((c) => c.status === "In Process");
    const unassigned = cases.filter((c) => c.status === "Unassigned");
    const completed = cases.filter((c) => c.status === "Completed" || c.status === "Archived");
    return {
      total: cases.length,
      active: active.length,
      inProcess: inProcess.length,
      unassigned: unassigned.length,
      completed: completed.length,
    };
  }, [cases]);

  const rows = useMemo(() => {
    let r = cases;
    if (statusFilter === "all") {
      r = r.filter((c) => c.status !== "Archived");
    } else if (statusFilter === "Completed") {
      r = r.filter((c) => c.status === "Completed" || c.status === "Archived");
    } else {
      r = r.filter((c) => c.status === statusFilter);
    }

    if (typeFilter !== "all") {
      r = r.filter((c) => c.caseTypeCode === typeFilter);
    }

    if (advocateFilter !== "all") {
      r = r.filter((c) =>
        (c.assignedLawyerIds || []).some(
          (id) => (id || "").toLowerCase() === advocateFilter.toLowerCase(),
        ),
      );
    }

    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (c) =>
          (c?.caseId || "").toLowerCase().includes(qq) ||
          (c?.legacyCaseId || "").toLowerCase().includes(qq) ||
          getClientName(c?.clientId).toLowerCase().includes(qq) ||
          (c?.matter || "").toLowerCase().includes(qq) ||
          (c?.ourRef || "").toLowerCase().includes(qq),
      );
    }

    return [...r].sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || ""),
    );
  }, [cases, q, statusFilter, typeFilter, advocateFilter, clientMap]);

  function resetFilters() {
    setQ("");
    setStatusFilter("all");
    setTypeFilter("all");
    setAdvocateFilter("all");
  }

  const hasActiveFilters = q.trim() || statusFilter !== "all" || typeFilter !== "all" || advocateFilter !== "all";

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
      <div className="page" style={{ maxWidth: 1400 }}>
        {/* Page Header */}
        <div className="page-head">
          <div>
            <h1>Cases Management</h1>
            <div className="sub">
              {stats.active} active cases · {stats.total} total files in system register.
            </div>
          </div>
          <Link to="/cases/new" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span>+</span>
            <span>New Client / Case</span>
          </Link>
        </div>

        {/* Top KPI Metrics Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <div
            className="card"
            style={{
              padding: "16px 20px",
              cursor: "pointer",
              border: statusFilter === "all" ? "2px solid var(--accent)" : "1px solid var(--line)",
              background: statusFilter === "all" ? "var(--surface)" : "var(--surface-2)",
              transition: "transform 0.15s ease",
            }}
            onClick={() => setStatusFilter("all")}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Active Cases
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent)", marginTop: 4 }}>
              {stats.active}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "16px 20px",
              cursor: "pointer",
              border: statusFilter === "In Process" ? "2px solid #2563EB" : "1px solid var(--line)",
              background: statusFilter === "In Process" ? "#EFF6FF" : "var(--surface-2)",
              transition: "transform 0.15s ease",
            }}
            onClick={() => setStatusFilter("In Process")}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase" }}>
              In Process
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1D4ED8", marginTop: 4 }}>
              {stats.inProcess}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "16px 20px",
              cursor: "pointer",
              border: statusFilter === "Unassigned" ? "2px solid var(--amber)" : "1px solid var(--line)",
              background: statusFilter === "Unassigned" ? "#FFFBEB" : "var(--surface-2)",
              transition: "transform 0.15s ease",
            }}
            onClick={() => setStatusFilter("Unassigned")}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#B45309", textTransform: "uppercase" }}>
              Unassigned
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#B45309", marginTop: 4 }}>
              {stats.unassigned}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "16px 20px",
              cursor: "pointer",
              border: statusFilter === "Completed" ? "2px solid #16A34A" : "1px solid var(--line)",
              background: statusFilter === "Completed" ? "#F0FDF4" : "var(--surface-2)",
              transition: "transform 0.15s ease",
            }}
            onClick={() => setStatusFilter("Completed")}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#15803D", textTransform: "uppercase" }}>
              Completed / Archived
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#15803D", marginTop: 4 }}>
              {stats.completed}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          className="card"
          style={{
            padding: 16,
            marginBottom: 16,
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* Search Input */}
            <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
              <input
                placeholder="Search by Case ID, previous ref, client, or matter…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                  padding: "10px 14px",
                  borderRadius: 9,
                  fontSize: 13.5,
                }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    fontSize: 14,
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Case Type Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                minWidth: 180,
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                padding: "10px 14px",
                borderRadius: 9,
                fontSize: 13.5,
              }}
            >
              <option value="all">All Case Types</option>
              {caseTypeOptions.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label} ({t.code})
                </option>
              ))}
            </select>

            {/* Advocate Filter Dropdown */}
            <select
              value={advocateFilter}
              onChange={(e) => setAdvocateFilter(e.target.value)}
              style={{
                minWidth: 180,
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                padding: "10px 14px",
                borderRadius: 9,
                fontSize: 13.5,
              }}
            >
              <option value="all">All Advocates</option>
              {lawyers
                .filter((l) => l.active)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                className="link"
                onClick={resetFilters}
                style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Status Chips Row */}
          <div
            className="chip-row"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              borderTop: "1px solid var(--line)",
              paddingTop: 12,
            }}
          >
            <button
              type="button"
              className={`chip${statusFilter === "all" ? " active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              Active ({stats.active})
            </button>
            {CASE_STATUSES.map((s) => {
              const count = cases.filter((c) => c.status === s).length;
              return (
                <button
                  key={s}
                  type="button"
                  className={`chip${statusFilter === s ? " active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Counter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 12.5, color: "var(--text-muted)", padding: "0 4px" }}>
          <span>Showing <strong>{rows.length}</strong> of {cases.length} cases</span>
        </div>

        {/* Cases Table */}
        <div className="table-wrap" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)", background: "var(--surface)" }}>
          <table>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "12px 16px" }}>Case ID</th>
                <th style={{ padding: "12px 16px" }}>Client</th>
                <th style={{ padding: "12px 16px" }}>Matter</th>
                <th style={{ padding: "12px 16px" }}>Type</th>
                <th style={{ padding: "12px 16px" }}>Assigned Advocate(s)</th>
                <th style={{ padding: "12px 16px" }}>Opened</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={8} style={{ padding: "48px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No cases found</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
                      {hasActiveFilters
                        ? "Try adjusting your search criteria or filters."
                        : "No cases registered yet."}
                    </div>
                    {hasActiveFilters && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
                        Clear All Filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {rows.map((c) => {
                const type = caseTypeByCode(c.caseTypeCode);
                const clientObj = getClient(c.clientId);
                const assignedCount = (c.assignedLawyerIds || []).length;

                return (
                  <tr
                    key={c.id}
                    className="clickable"
                    onClick={() => nav(`/cases/${c.id}`)}
                    style={{ transition: "background 0.12s ease" }}
                  >
                    <td className="mono" style={{ padding: "14px 16px", fontWeight: 700 }}>
                      <div style={{ color: "var(--accent)", fontSize: 14 }}>
                        {c.caseId}
                      </div>
                      {c.legacyCaseId && (
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            marginTop: 3,
                            display: "inline-block",
                            background: "var(--surface-3)",
                            padding: "1px 6px",
                            borderRadius: 4,
                          }}
                          title={`Previous Case ID: ${c.legacyCaseId}`}
                        >
                          Prev: {c.legacyCaseId}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                        {clientObj?.name || "—"}
                      </div>
                      {clientObj?.phone && (
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                          {clientObj.phone}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "14px 16px", maxWidth: 260 }}>
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: 13,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.matter || "—"}
                      </div>
                      {c.ourRef && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          Ref: {c.ourRef}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      {type && (
                        <span className={`folder-chip ${type.color}`}>
                          {type.code}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      {assignedCount > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {c.assignedLawyerIds.map((lId) => (
                            <span
                              key={lId}
                              className="chip"
                              style={{
                                fontSize: 11.5,
                                padding: "2px 8px",
                                background: "var(--surface-2)",
                              }}
                            >
                              ⚖️ {lawyerName(lId)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: "var(--amber)",
                            background: "#FFFBEB",
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: "1px solid #FDE68A",
                          }}
                        >
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--text-muted)" }}>
                      {formatDateOnly(c.openingDate)}
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      <CaseStatus status={c.status} />
                    </td>

                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <span
                        className="link"
                        style={{ fontSize: 12, fontWeight: 700 }}
                      >
                        View →
                      </span>
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
