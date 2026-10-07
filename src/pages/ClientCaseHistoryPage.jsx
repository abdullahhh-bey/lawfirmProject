import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Topbar from "../components/layout/Topbar.jsx";
import CaseStatus from "../components/cases/CaseStatus.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import {
  cases as casesApi,
  clients as clientsApi,
  lawyers as lawyersApi,
} from "../lib/api.js";
import { caseTypeByCode } from "../data/nomenclature.js";

export default function ClientCaseHistoryPage() {
  const { clientId } = useParams();
  const nav = useNavigate();
  const [client, setClient] = useState(null);
  const [cases, setCases] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const [clientData, caseList, lawyerList] = await Promise.all([
          clientsApi.get(clientId),
          casesApi.listByClient(clientId),
          lawyersApi.list(),
        ]);
        if (!active) return;
        setClient(clientData);
        setCases(caseList);
        setLawyers(lawyerList);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [clientId]);

  const lawyerMap = useMemo(
    () => new Map(lawyers.map((l) => [l.id, l.name])),
    [lawyers],
  );

  const rows = useMemo(() => {
    return [...cases].sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || ""),
    );
  }, [cases]);

  if (loading) {
    return (
      <>
        <Topbar />
        <LoadingSpinner text="Loading case history…" />
      </>
    );
  }

  return (
    <>
      <Topbar />
      <div className="page">
        <button
          className="link"
          onClick={() => nav("/clients")}
          style={{ fontSize: 12, marginBottom: 10, display: "inline-block" }}
        >
          ← Back to Clients
        </button>
        <div className="page-head">
          <div>
            <h1>{client?.name || "Client History"}</h1>
            <div className="sub">
              {client?.email || "—"} · {client?.phone || "—"}
            </div>
          </div>
          <div className="sub">
            {cases.length} total case{cases.length === 1 ? "" : "s"} shown
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Type</th>
                <th>Matter</th>
                <th>Advocates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={5}>No cases found for this client.</td>
                </tr>
              )}
              {rows.map((c) => {
                const type = caseTypeByCode(c.caseTypeCode);
                const assigned = (c.assignedLawyerIds || []).map(
                  (id) => lawyerMap.get(id) || "Unassigned",
                );
                return (
                  <tr
                    key={c.id}
                    className="clickable"
                    onClick={() => nav(`/cases/${c.id}`)}
                  >
                    <td className="mono" style={{ fontWeight: 700 }}>
                      {c.caseId}
                    </td>
                    <td>
                      {type && (
                        <span className={`folder-chip ${type.color}`}>
                          {type.code}
                        </span>
                      )}
                    </td>
                    <td>{c.matter || "—"}</td>
                    <td>
                      {assigned.length ? assigned.join(", ") : "Unassigned"}
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
