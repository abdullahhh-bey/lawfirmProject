import React, { useMemo, useState } from "react";
import StatusBadge from "../ui/StatusBadge.jsx";

export default function LawyerList({
  lawyers,
  cases,
  tasks,
  onEdit,
  onToggleActive,
  onMessage,
  onDelete,
}) {
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => lawyers.filter((l) => l.name.toLowerCase().includes(q.toLowerCase())),
    [lawyers, q],
  );

  const loadFor = (id) => ({
    cases: cases.filter((c) => (c.assignedLawyerIds || []).includes(id)).length,
    tasks: tasks.filter(
      (t) =>
        (t.assignedLawyerIds || []).includes(id) && t.status !== "Completed",
    ).length,
  });

  return (
    <div>
      <input
        placeholder="Search advocates by name…"
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
              <th>Advocate</th>
              <th>Contact</th>
              <th>Active Cases</th>
              <th>Open Tasks</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={6}>No advocates match this search.</td>
              </tr>
            )}
            {rows.map((l) => {
              const load = loadFor(l.id);
              return (
                <tr key={l.id}>
                  <td>
                    <div className="cell-main">
                      <div className="avatar">
                        {l.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="cell-name">{l.name}</div>
                        <div className="cell-sub">{l.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono">{l.phone || "—"}</td>
                  <td>{load.cases}</td>
                  <td>{load.tasks}</td>
                  <td>
                    <StatusBadge status={l.active ? "Active" : "Inactive"} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn-sm"
                        title="Message"
                        onClick={() => onMessage(l)}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>
                      <button
                        className="icon-btn-sm"
                        title="Edit"
                        onClick={() => onEdit(l)}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        className={`icon-btn-sm${l.active ? " del" : ""}`}
                        title={l.active ? "Deactivate" : "Activate"}
                        onClick={() => onToggleActive(l)}
                      >
                        {l.active ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
                          </svg>
                        ) : (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </button>
                      <button
                        className="icon-btn-sm del"
                        title="Delete"
                        onClick={() => onDelete(l)}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
