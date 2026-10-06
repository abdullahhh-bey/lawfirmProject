import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/layout/Topbar.jsx";
import Calendar from "../components/calendar/Calendar.jsx";
import { tasks as tasksApi, cases as casesApi } from "../lib/api.js";
import { useApp } from "../context/AppContext.jsx";

export default function LawyerCalendarPage() {
  const { session } = useApp();
  const nav = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [cases, setCases] = useState([]);

  useEffect(() => {
    Promise.all([
      tasksApi.listForLawyer(session.id),
      casesApi.listForLawyer(session.id),
    ]).then(([t, c]) => {
      setTasks(t);
      setCases(c);
    });
  }, [session.id]);

  const caseMetaFor = (task) => {
    const c = cases.find((c) => c.id === task.caseId);
    return c ? { caseId: c.caseId, status: c.status } : null;
  };

  return (
    <>
      <Topbar />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>My Calendar</h1>
            <div className="sub">Your tasks and upcoming reminders.</div>
          </div>
        </div>
        <Calendar
          tasks={tasks}
          caseMetaFor={caseMetaFor}
          onTaskClick={(t) => nav(`/portal/cases/${t.caseId}`)}
        />
      </div>
    </>
  );
}
