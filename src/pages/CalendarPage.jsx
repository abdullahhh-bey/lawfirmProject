import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/layout/Topbar.jsx";
import Calendar from "../components/calendar/Calendar.jsx";
import { tasks as tasksApi, cases as casesApi } from "../lib/api.js";

export default function CalendarPage() {
  const nav = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [cases, setCases] = useState([]);

  useEffect(() => {
    Promise.all([tasksApi.listAll(), casesApi.list()]).then(([t, c]) => {
      setTasks(t);
      setCases(c);
    });
  }, []);

  const caseMetaFor = (task) => {
    const c = cases.find((c) => c.id === task.caseId);
    return c ? { caseId: c.caseId, status: c.status } : null;
  };

  return (
    <>
      <Topbar />
      <div className="page calendar-page">
        <div className="page-head">
          <div>
            <h1>Calendar</h1>
            <div className="sub">
              All case tasks and their 3-day reminders, firm-wide.
            </div>
          </div>
        </div>
        <Calendar
          tasks={tasks}
          caseMetaFor={caseMetaFor}
          onTaskClick={(t) => nav(`/cases/${t.caseId}`)}
        />
      </div>
    </>
  );
}
