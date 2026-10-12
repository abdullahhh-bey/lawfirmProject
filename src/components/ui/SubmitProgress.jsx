import React from "react";

export default function SubmitProgress({ label }) {
  return (
    <div className="submit-progress" role="status" aria-live="polite">
      <span className="submit-progress-label">{label}</span>
      <div
        className="submit-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuetext="In progress"
      >
        <span className="submit-progress-bar" />
      </div>
    </div>
  );
}
