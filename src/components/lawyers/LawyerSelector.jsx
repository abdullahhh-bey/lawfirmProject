import React, { useEffect, useState } from "react";
import { lawyers as lawyersApi } from "../../lib/api.js";

// Reusable in: Create Case (optional assignment), Task cards (assign/reassign),
// Case Details (reassign lawyer), Message Composer (recipient pick).
export default function LawyerSelector({
  value,
  onChange,
  placeholder = "Search advocate by name…",
  allowClear = true,
}) {
  const [all, setAll] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    lawyersApi.list().then(setAll);
  }, []);

  const selected = all.find((l) => l.id === value) || null;
  const results = all.filter(
    (l) => l.active && l.name.toLowerCase().includes(query.toLowerCase()),
  );

  if (selected && !open) {
    return (
      <div
        className="field-row"
        style={{ alignItems: "center", gridTemplateColumns: "1fr auto auto" }}
      >
        <div
          style={{
            background: "var(--surface-2)",
            border: "1.5px solid var(--line)",
            borderRadius: 9,
            padding: "10px 13px",
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          {selected.name}{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
            · {selected.email}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen(true)}
        >
          Change
        </button>
        {allowClear && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange(null)}
          >
            Remove
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div
          style={{
            marginTop: 6,
            border: "1px solid var(--line)",
            borderRadius: 9,
            overflow: "hidden",
            background: "var(--surface-2)",
          }}
        >
          {results.length === 0 && (
            <div
              style={{
                padding: "10px 13px",
                fontSize: 12.5,
                color: "var(--text-muted)",
              }}
            >
              No matching active advocates.
            </div>
          )}
          {results.map((l) => (
            <div
              key={l.id}
              onClick={() => {
                onChange(l.id);
                setOpen(false);
                setQuery("");
              }}
              style={{
                padding: "10px 13px",
                fontSize: 13,
                cursor: "pointer",
                borderBottom: "1px solid var(--line)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface-3)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <strong>{l.name}</strong>{" "}
              <span style={{ color: "var(--text-muted)" }}>· {l.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
