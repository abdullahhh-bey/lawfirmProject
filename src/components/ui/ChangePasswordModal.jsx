import React, { useState } from "react";
import { auth } from "../../lib/api.js";
import Modal from "./Modal.jsx";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  function closeModal() {
    if (loading) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
    onClose();
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await auth.changePassword(currentPassword, newPassword);
      setSuccess(res.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Change Password"
      sub="Choose a new password for your account."
      onClose={closeModal}
      maxWidth="440px"
      className="password-modal"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="err-text" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div
            className="field-hint"
            role="status"
            style={{ color: "var(--green)", marginBottom: 14 }}
          >
            {success}
          </div>
        )}
        <div className="field">
          <label htmlFor="current-password">Current Password</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={loading || Boolean(success)}
          />
        </div>
        <div className="field">
          <label htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading || Boolean(success)}
          />
          <div className="field-hint">Use at least 6 characters.</div>
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm New Password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading || Boolean(success)}
          />
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={closeModal}
            disabled={loading}
          >
            {success ? "Close" : "Cancel"}
          </button>
          {!success && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
