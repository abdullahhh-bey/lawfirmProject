import React, { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import ChangePasswordModal from "../ui/ChangePasswordModal.jsx";

export default function Topbar({ title }) {
  const { session } = useApp();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const isLawyer = session?.role === "lawyer";

  return (
    <div className="topbar">
      <div className="topbar-search">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          placeholder="Search cases, clients, advocates…"
          disabled
          title="Wire this to a backend search endpoint"
        />
      </div>
      <div
        className="topbar-right"
        style={{ display: "flex", alignItems: "center", gap: "12px" }}
      >
        {isLawyer && (
          <button
            type="button"
            className="btn btn-ghost btn-sm password-button"
            onClick={() => setShowPasswordModal(true)}
            title="Update your password"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Change Password
          </button>
        )}
        <button className="icon-btn" title="Notifications">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <span className="dot-badge" />
        </button>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
