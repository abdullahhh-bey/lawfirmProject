import React, { useEffect, useState } from "react";
import { lawyers as lawyersApi } from "../../lib/api.js";

// Used for Task assignment (can be multiple lawyers), distinct from the
// single-select LawyerSelector used for case-level assignment.
export default function MultiLawyerSelector({ value = [], onChange }) {
  const [all, setAll] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    lawyersApi.list().then(setAll);
  }, []);

  const selectedLawyers = all.filter((l) => value.includes(l.id));
  const active = all.filter((l) => l.active);

  function toggle(id) {
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: open ? 8 : 0,
        }}
      >
        {selectedLawyers.map((l) => (
          <span
            key={l.id}
            className="chip active"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {l.name}
            <button
              type="button"
              onClick={() => toggle(l.id)}
              style={{ fontWeight: 700 }}
            >
              ✕
            </button>
          </span>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Done" : "+ Assign advocate(s)"}
        </button>
      </div>
      {open && (
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 9,
            overflow: "hidden",
            background: "var(--surface-2)",
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          {active.length === 0 && (
            <div
              style={{
                padding: "10px 13px",
                fontSize: 12.5,
                color: "var(--text-muted)",
              }}
            >
              No active advocates.
            </div>
          )}
          {active.map((l) => (
            <label
              key={l.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 13px",
                borderBottom: "1px solid var(--line)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={value.includes(l.id)}
                onChange={() => toggle(l.id)}
              />
              <strong>{l.name}</strong>{" "}
              <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                {l.email}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
