import React, { useEffect, useState } from "react";

export default function MutationProgressBar() {
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer;
    const handleProgress = (event) => {
      const isActive = event.detail?.activeCount > 0;
      setActive(isActive);

      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = undefined;
      }

      if (isActive) {
        setVisible(true);
      } else {
        hideTimer = window.setTimeout(() => setVisible(false), 300);
      }
    };

    window.addEventListener("app:mutation-progress", handleProgress);
    return () => {
      window.removeEventListener("app:mutation-progress", handleProgress);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`mutation-progress${active ? " is-active" : " is-finishing"}`}
      role="status"
      aria-live="polite"
    >
      <span className="mutation-progress-label">
        {active ? "Processing your request…" : "Almost done…"}
      </span>
      <span className="mutation-progress-track" aria-hidden="true">
        <span className="mutation-progress-indicator" />
      </span>
    </div>
  );
}
