import React from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import logoUrl from "../ui/lawfirmLOGO.jpg?url";

const icon = (path) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
);
const ICONS = {
  dashboard: icon(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>,
  ),
  cases: icon(
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </>,
  ),
  clients: icon(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a7 7 0 0 1 16 0v1" />
    </>,
  ),
  calendar: icon(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>,
  ),
  lawyers: icon(
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 20v-1a6 6 0 0 1 12 0v1M15 20v-.7a5 5 0 0 1 7-4.6" />
    </>,
  ),
  messages: icon(
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </>,
  ),
  plus: icon(
    <>
      <path d="M12 5v14M5 12h14" />
    </>,
  ),
  finance: icon(
    <text
      x="6"
      y="20"
      fontSize="21"
      fontWeight="600"
      stroke="none"
      fill="currentColor"
    >
      £
    </text>,
  ),
};

export default function Sidebar() {
  const { session, logout } = useApp();
  const isAdmin = session?.role === "admin";

  return (
    <aside className="sidebar">
      <div className="brand">
        <img
          className="brand-logo"
          src={logoUrl}
          alt="PLUG SOLICITORS — Just in Case"
          width="200"
          height="133"
        />
      </div>

      {isAdmin ? (
        <>
          <div className="nav-group">
            <div className="nav-label">Overview</div>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              {ICONS.dashboard}Dashboard
            </NavLink>
          </div>
          <div className="nav-group">
            <div className="nav-label">Workflow</div>
            <NavLink
              to="/cases"
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              {ICONS.cases}Cases
            </NavLink>
            <NavLink
              to="/cases/new"
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              {ICONS.plus}New Client / Case
            </NavLink>
            <NavLink
              to="/clients"
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              {ICONS.clients}Clients
            </NavLink>
            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              {ICONS.calendar}Calendar
            </NavLink>
            <NavLink
              to="/finance"
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              {ICONS.finance}Finance
            </NavLink>
          </div>
          <div className="nav-group">
            <div className="nav-label">Team</div>
            <NavLink
              to="/lawyers"
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              {ICONS.lawyers}Advocates
            </NavLink>
            <NavLink
              to="/messaging"
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              {ICONS.messages}Messaging
            </NavLink>
          </div>
        </>
      ) : (
        <div className="nav-group">
          <div className="nav-label">My Portal</div>
          <NavLink
            to="/portal"
            end
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            {ICONS.dashboard}My Cases
          </NavLink>
          <NavLink
            to="/portal/calendar"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            {ICONS.calendar}Calendar
          </NavLink>
          <NavLink
            to="/portal/messages"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            {ICONS.messages}Messages
          </NavLink>
        </div>
      )}

      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="avatar">
            {(session?.name || "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="who">
            <div className="name">{session?.name}</div>
            <div className="role">
              {session?.role === "lawyer" ? "Advocate" : session?.role}
            </div>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
