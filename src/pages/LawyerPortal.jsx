import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/layout/Topbar.jsx";
import CaseStatus from "../components/cases/CaseStatus.jsx";
import {
  cases as casesApi,
  clients as clientsApi,
  tasks as tasksApi,
} from "../lib/api.js";
import { caseTypeByCode } from "../data/nomenclature.js";
import { useApp } from "../context/AppContext.jsx";

export default function LawyerPortal() {
  const { session } = useApp();
  const nav = useNavigate();
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [caseSection, setCaseSection] = useState("uncompleted");

  useEffect(() => {
    Promise.all([
      casesApi.listForLawyer(session.id),
      clientsApi.list(),
      tasksApi.listForLawyer(session.id),
    ]).then(([c, cl, t]) => {
      setCases(c);
      setClients(cl);
      setTasks(t);
    });
  }, [session.id]);

  const clientName = (id) => clients.find((c) => c.id === id)?.name || "—";
  const openTasksFor = (caseId) =>
    tasks.filter((t) => t.caseId === caseId && t.status !== "Completed").length;
  const caseSections = {
    "in-progress": cases.filter((c) => c.status === "In Process"),
    completed: cases.filter((c) => c.status === "Completed"),
    uncompleted: cases.filter(
      (c) => !["In Process", "Completed", "Archived"].includes(c.status),
    ),
    archived: cases.filter((c) => c.status === "Archived"),
  };
  const visibleCases = caseSections[caseSection];

  return (
    <>
      <Topbar />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>My Cases</h1>
            <div className="sub">
              Cases currently assigned to you, {session.name}.
            </div>
          </div>
        </div>

        <div
          className="chip-row"
          role="group"
          aria-label="Filter cases by status"
        >
          {[
            ["in-progress", "In Progress"],
            ["completed", "Completed"],
            ["uncompleted", "Incompleted"],
            ["archived", "Archived"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`chip${caseSection === key ? " active" : ""}`}
              aria-pressed={caseSection === key}
              onClick={() => setCaseSection(key)}
            >
              {label} ({caseSections[key].length})
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
                <th>Open Tasks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleCases.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={5}>
                    No{" "}
                    {caseSection === "in-progress"
                      ? "in-progress"
                      : caseSection}{" "}
                    cases.
                  </td>
                </tr>
              )}
              {visibleCases.map((c) => {
                const type = caseTypeByCode(c.caseTypeCode);
                return (
                  <tr
                    key={c.id}
                    className="clickable"
                    onClick={() => nav(`/portal/cases/${c.id}`)}
                  >
                    <td className="mono" style={{ fontWeight: 700 }}>
                      <div>{c.caseId}</div>
                      {c.legacyCaseId && (
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                          title={`Previous Case ID: ${c.legacyCaseId}`}
                        >
                          Prev: {c.legacyCaseId}
                        </div>
                      )}
                    </td>
                    <td>{clientName(c.clientId)}</td>
                    <td>
                      {type && (
                        <span className={`folder-chip ${type.color}`}>
                          {type.code}
                        </span>
                      )}
                    </td>
                    <td>{openTasksFor(c.id)}</td>
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
