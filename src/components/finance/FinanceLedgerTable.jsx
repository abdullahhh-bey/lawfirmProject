import React from "react";

export default function FinanceLedgerTable({ rows, caseIdFor, onRemove }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Reference</th>
            <th>Particulars</th>
            <th>Case</th>
            <th>Account</th>
            <th>In</th>
            <th>Out</th>
            <th>Balance</th>
            {onRemove && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="empty-row">
              <td colSpan={onRemove ? 9 : 8}>
                No payments recorded for this client yet.
              </td>
            </tr>
          )}
          {rows
            .slice()
            .reverse()
            .map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.date}</td>
                <td className="mono">{r.reference || "—"}</td>
                <td>
                  <div className="cell-name">{r.particulars || "—"}</div>
                  {r.description && (
                    <div className="cell-sub">{r.description}</div>
                  )}
                </td>
                <td className="mono">
                  {caseIdFor ? caseIdFor(r.caseId) || "—" : "—"}
                </td>
                <td>
                  <span
                    className={`badge ${r.account === "client" ? "assigned" : "seen"}`}
                  >
                    {r.account === "client" ? "Client A/C" : "Office A/C"}
                  </span>
                </td>
                <td className="mono" style={{ color: "var(--green)" }}>
                  {r.type === "IN"
                    ? `£ ${Number(r.amount).toLocaleString("en-GB")}`
                    : "—"}
                </td>
                <td className="mono" style={{ color: "var(--red)" }}>
                  {r.type === "OUT"
                    ? `£ ${Number(r.amount).toLocaleString("en-GB")}`
                    : "—"}
                </td>
                <td className="mono" style={{ fontWeight: 700 }}>
                  £ {r.balance.toLocaleString("en-GB")}
                </td>
                {onRemove && (
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn-sm del"
                        title="Remove entry"
                        onClick={() => onRemove(r)}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
