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
    <section className="card calendar-card" aria-label={`${label} calendar`}>
      <div className="calendar-toolbar">
        <div className="calendar-heading">
          <span className="calendar-kicker">Schedule</span>
          <h2>{label}</h2>
        </div>
        <div className="calendar-controls" aria-label="Calendar navigation">
          <button
            type="button"
            className="icon-btn-sm calendar-nav-btn"
            aria-label="Previous month"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className="calendar-today-btn"
            onClick={() => setCursor(new Date())}
          >
            Today
          </button>
          <button
            type="button"
            className="icon-btn-sm calendar-nav-btn"
            aria-label="Next month"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
      <div className="calendar-legend" aria-label="Calendar item legend">
        <span><i className="calendar-legend-dot due" />Task due</span>
        <span><i className="calendar-legend-dot reminder" />3-day reminder</span>
      </div>
      <div className="calendar-scroll">
        <div className="cal-grid calendar-weekdays">
          {DOW.map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
        </div>
        <div className="cal-grid calendar-days">
          {cells.map((key, i) => {
            if (!key) return <div key={i} className="cal-cell empty" aria-hidden="true" />;
            const items = tasksByDay[key] || [];
            return (
              <div
                key={key}
                className={`cal-cell${key === todayKey ? " today" : ""}`}
                aria-current={key === todayKey ? "date" : undefined}
              >
                <div className="cal-daynum">
                  <span>{Number(key.slice(-2))}</span>
                  {key === todayKey && <span className="calendar-today-label">Today</span>}
                </div>
                <div className="calendar-day-items">
                  {items.slice(0, 3).map((t, idx) => {
                    const caseId = caseMetaFor?.(t)?.caseId;
                    const title = `${t.name}${caseId ? ` · ${caseId}` : ""}${t.reminderSent ? " (WhatsApp Reminder Sent)" : ""}`;
                    return (
                      <button
                        key={`${t.id}${t.kind}${idx}`}
                        type="button"
                        className={`cal-task-pill${t.kind === "reminder" ? " reminder" : ""}${onTaskClick ? " clickable" : ""}`}
                        title={title}
                        onClick={() => onTaskClick?.(t)}
                        disabled={!onTaskClick}
                      >
                        {t.kind === "reminder" && <span aria-hidden="true">⏰</span>}
                        <span className="calendar-task-name">{t.name}</span>
                        {t.reminderSent && (
                          <span className="calendar-reminder-sent" title="WhatsApp reminder sent" aria-label="WhatsApp reminder sent">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {items.length > 3 && (
                    <span className="calendar-more">+{items.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
