import React, { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import ChangePasswordModal from "../ui/ChangePasswordModal.jsx";

export default function Topbar({ title }) {
  const { session } = useApp();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const isLawyer = session?.role === "lawyer";

  if (!isLawyer) return null;

  return (
    <div className="topbar">
      <div className="topbar-right">
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
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
