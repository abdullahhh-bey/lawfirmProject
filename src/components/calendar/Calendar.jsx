import React, { useMemo, useState } from "react";

function addDays(dateStr, n) {
  const clean = (dateStr || "").slice(0, 10);
  const parts = clean.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return clean;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + n));
  return d.toISOString().slice(0, 10);
}
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar({ tasks = [], caseMetaFor, onTaskClick }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const todayKey = new Date().toISOString().slice(0, 10);

  const { cells, label } = useMemo(() => {
    const year = cursor.getFullYear(),
      month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push(key);
    }
    const label = cursor.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    return { cells, label };
  }, [cursor]);

  const tasksByDay = useMemo(() => {
    const map = {};
    for (const t of tasks || []) {
      const caseStatus = caseMetaFor?.(t)?.status;
      if (
        t.status === "Completed" ||
        caseStatus === "Archived" ||
        caseStatus === "Completed"
      )
        continue;
      if (!t.date) continue;
      const dateKey = (t.date || "").slice(0, 10);
      if (!dateKey) continue;
      (map[dateKey] ||= []).push({ ...t, kind: "due" });
      if (t.status !== "Completed") {
        const remKey = addDays(dateKey, -3);
        (map[remKey] ||= []).push({ ...t, kind: "reminder" });
      }
    }
    return map;
  }, [tasks, caseMetaFor]);

  return (
    <div className="card">
      <div className="card-head">
        <h3>{label}</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="icon-btn-sm"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            ‹
          </button>
          <button className="icon-btn-sm" onClick={() => setCursor(new Date())}>
            Today
          </button>
          <button
            className="icon-btn-sm"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            ›
          </button>
        </div>
      </div>
      <div className="cal-grid" style={{ marginBottom: 8 }}>
        {DOW.map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((key, i) => {
          if (!key) return <div key={i} className="cal-cell empty" />;
          const items = tasksByDay[key] || [];
          return (
            <div
              key={key}
              className={`cal-cell${key === todayKey ? " today" : ""}`}
            >
              <div className="cal-daynum">{Number(key.slice(-2))}</div>
              {items.slice(0, 3).map((t, idx) => (
                <div
                  key={t.id + t.kind + idx}
                  className={`cal-task-pill${t.kind === "reminder" ? " reminder" : ""}`}
                  title={`${t.name}${caseMetaFor?.(t)?.caseId ? " · " + caseMetaFor(t).caseId : ""}${t.reminderSent ? " (WhatsApp Reminder Sent ✓)" : ""}`}
                  onClick={() => onTaskClick?.(t)}
                  style={{
                    cursor: onTaskClick ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span>{t.kind === "reminder" ? "⏰" : ""}</span>
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.name}
                  </span>
                  {(t.reminderSent || t.kind === "reminder") && (
                    <span
                      title="WhatsApp Reminder Sent"
                      style={{
                        color: "#22c55e",
                        fontWeight: "bold",
                        fontSize: 11,
                      }}
                    >
                      {t.reminderSent ? "✅" : ""}
                    </span>
                  )}
                </div>
              ))}
              {items.length > 3 && (
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  +{items.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
