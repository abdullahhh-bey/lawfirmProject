import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/layout/Topbar.jsx";
import { finance as financeApi } from "../lib/api.js";

import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";

export default function FinancePage() {
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    financeApi.summaries().then(setRows);
  }, []);

  const filtered = useMemo(
    () =>
      (rows || []).filter((r) =>
        (r.client?.name || r.clientName || "")
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [rows, q],
  );

  const totals = useMemo(() => {
    const list = rows || [];
    return {
      agreed: list.reduce((s, r) => s + (Number(r.agreed) || 0), 0),
      officeBalance: list.reduce(
        (s, r) => s + (Number(r.officeBalance) || 0),
        0,
      ),
      clientBalance: list.reduce(
        (s, r) => s + (Number(r.clientBalance) || 0),
        0,
      ),
      outstanding: list.reduce((s, r) => s + (Number(r.outstanding) || 0), 0),
    };
  }, [rows]);

  if (rows === null) {
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
            <h1>Finance</h1>
            <div className="sub">
              Every client generated on the Clients / Cases pages shows up here
              automatically — click one to record payments.
            </div>
          </div>
        </div>

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="card stat-card">
            <div className="stat-label">Fees Agreed (all clients)</div>
            <div className="stat-value">
              £ {totals.agreed.toLocaleString("en-GB")}
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Office Account Balance</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>
              £ {totals.officeBalance.toLocaleString("en-GB")}
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Client Account Balance</div>
            <div className="stat-value" style={{ color: "var(--blue)" }}>
              £ {totals.clientBalance.toLocaleString("en-GB")}
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Outstanding (vs. fee agreed)</div>
            <div className="stat-value" style={{ color: "var(--amber)" }}>
              £ {totals.outstanding.toLocaleString("en-GB")}
            </div>
          </div>
        </div>

        <input
          placeholder="Search clients by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            maxWidth: 320,
            marginBottom: 16,
            background: "var(--surface-2)",
            border: "1.5px solid var(--line)",
            color: "var(--text)",
            padding: "10px 13px",
            borderRadius: 9,
            fontSize: 13.5,
          }}
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Cases</th>
                <th>Fee Agreed</th>
                <th>Office A/C Balance</th>
                <th>Client A/C Balance</th>
                <th>Outstanding</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && (
                <tr className="empty-row">
                  <td colSpan={7}>Loading…</td>
                </tr>
              )}
              {rows !== null && filtered.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={7}>No clients match this search.</td>
                </tr>
              )}
              {filtered.map((r) => {
                const clientId = r.client?.id || r.clientId;
                const clientName = r.client?.name || r.clientName || "Client";
                const clientPhone = r.client?.phone || r.clientPhone || "—";
                const agreed = Number(r.agreed) || 0;
                const officeBalance = Number(r.officeBalance) || 0;
                const clientBalance = Number(r.clientBalance) || 0;
                const outstanding = Number(r.outstanding) || 0;

                return (
                  <tr
                    key={clientId}
                    className="clickable"
                    onClick={() => nav(`/finance/${clientId}`)}
                  >
                    <td>
                      <div className="cell-main">
                        <div className="avatar">
                          {(clientName.slice(0, 2) || "CL").toUpperCase()}
                        </div>
                        <div>
                          <div className="cell-name">{clientName}</div>
                          <div className="cell-sub">{clientPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td>{r.caseCount || 0}</td>
                    <td className="mono">
                      {agreed ? `£ ${agreed.toLocaleString("en-GB")}` : "—"}
                    </td>
                    <td className="mono" style={{ color: "var(--green)" }}>
                      {officeBalance
                        ? `£ ${officeBalance.toLocaleString("en-GB")}`
                        : "—"}
                    </td>
                    <td className="mono" style={{ color: "var(--blue)" }}>
                      {clientBalance
                        ? `£ ${clientBalance.toLocaleString("en-GB")}`
                        : "—"}
                    </td>
                    <td
                      className="mono"
                      style={{
                        color: outstanding
                          ? "var(--amber)"
                          : "var(--text-muted)",
                      }}
                    >
                      {outstanding
                        ? `£ ${outstanding.toLocaleString("en-GB")}`
                        : "—"}
                    </td>
                    <td className="mono">{r.lastActivity || "—"}</td>
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
