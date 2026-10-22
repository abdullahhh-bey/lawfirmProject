import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { caseTypeByCode } from "../../data/nomenclature.js";
import CaseStatus from "./CaseStatus.jsx";
import MultiLawyerSelector from "../lawyers/MultiLawyerSelector.jsx";
import DocumentManager from "../documents/DocumentManager.jsx";
import { formatDateOnly, formatDateTime, formatTurnaroundTime } from "../../lib/dateUtils.js";

export default function CaseDetails({
  caseRecord,
  lawyer,
  onReassign,
  onEditToggle,
  onDocumentsChange,
  feeReceived,
  clientId,
  isAdmin = false,
  onSaveLegacyCaseId,
}) {
  const [editingLegacyCaseId, setEditingLegacyCaseId] = useState(false);
  const [legacyCaseId, setLegacyCaseId] = useState(caseRecord.legacyCaseId || "");
  const [savingLegacyCaseId, setSavingLegacyCaseId] = useState(false);
  const [legacyCaseIdError, setLegacyCaseIdError] = useState("");
  const type = caseTypeByCode(caseRecord.caseTypeCode);

  useEffect(() => {
    setLegacyCaseId(caseRecord.legacyCaseId || "");
  }, [caseRecord.legacyCaseId]);

  async function saveLegacyCaseId() {
    if (savingLegacyCaseId) return;
    setSavingLegacyCaseId(true);
    setLegacyCaseIdError("");
    try {
      await onSaveLegacyCaseId(legacyCaseId.trim());
      setEditingLegacyCaseId(false);
    } catch (error) {
      setLegacyCaseIdError(error.message || "Could not save the previous case ID.");
    } finally {
      setSavingLegacyCaseId(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Case Information</h3>
        {onEditToggle && (
          <button className="link" onClick={onEditToggle}>
            Edit
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <span
          className="mono"
          style={{ fontWeight: 800, fontSize: 15, color: "var(--accent)" }}
        >
          {caseRecord.caseId}
        </span>
        {type && (
          <span className={`folder-chip ${type.color}`}>
            {type.color.toUpperCase()}
          </span>
        )}
        <CaseStatus status={caseRecord.status} />
      </div>

      <div style={{ display: "grid", gap: 10, fontSize: 13, marginBottom: 16 }}>
        <Row label="Case Type" value={type?.label} />
        <div className="legacy-case-id-row">
          <span className="legacy-case-id-label">Previous Case ID</span>
          {editingLegacyCaseId ? (
            <div className="legacy-case-id-editor">
              <input
                aria-label="Previous case ID"
                maxLength={100}
                value={legacyCaseId}
                onChange={(event) => setLegacyCaseId(event.target.value)}
                disabled={savingLegacyCaseId}
                autoFocus
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={saveLegacyCaseId}
                disabled={savingLegacyCaseId}
              >
                {savingLegacyCaseId ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setLegacyCaseId(caseRecord.legacyCaseId || "");
                  setLegacyCaseIdError("");
                  setEditingLegacyCaseId(false);
                }}
                disabled={savingLegacyCaseId}
              >
                Cancel
              </button>
              {legacyCaseIdError && (
                <span className="err-text" role="alert">{legacyCaseIdError}</span>
              )}
            </div>
          ) : (
            <div className="legacy-case-id-value">
              <span>{caseRecord.legacyCaseId || "Not set"}</span>
              {isAdmin && (
                <button
                  type="button"
                  className="back-link legacy-case-id-edit"
                  onClick={() => {
                    setLegacyCaseId(caseRecord.legacyCaseId || "");
                    setEditingLegacyCaseId(true);
                  }}
                >
                  {caseRecord.legacyCaseId ? "Edit" : "Add"}
                </button>
              )}
            </div>
          )}
        </div>
        <Row label="Matter" value={caseRecord.matter} />
        <Row label="Our Ref" value={caseRecord.ourRef} />
        <Row label="Opening Date" value={formatDateOnly(caseRecord.openingDate)} />
        <Row label="Closing Date" value={caseRecord.closingDate ? formatDateOnly(caseRecord.closingDate) : "—"} />
        <Row
          label="Fee Agreed"
          value={
            caseRecord.feeAgreed
              ? `£ ${Number(caseRecord.feeAgreed).toLocaleString("en-GB")}`
              : "—"
          }
        />
        <Row
          label="Fee Received"
          value={
            <>
              {`£ ${Number(feeReceived || 0).toLocaleString("en-GB")}`}
              {clientId && (
                <Link
                  to={`/finance/${clientId}`}
                  className="link"
                  style={{ marginLeft: 8, fontSize: 11.5 }}
                >
                  View in Finance →
                </Link>
              )}
            </>
          }
        />
        {caseRecord.caseTypeCode === "PI" &&
          Object.entries(caseRecord.piFields || {}).some(([, v]) => v) &&
          Object.entries(caseRecord.piFields).map(
            ([k, v]) => v && <Row key={k} label={k.toUpperCase()} value={v} />,
          )}
      </div>

      <div className="field">
        <label>Assigned Advocate(s)</label>
        <MultiLawyerSelector
          value={caseRecord.assignedLawyerIds || []}
          onChange={onReassign}
        />
      </div>

      {/* Advocate Assignment & Work Time Tracking */}
      {(caseRecord.assignedLawyerIds || []).length > 0 && (
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 16,
            display: "grid",
            gap: 8,
            fontSize: 12.5,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
              📌 Assigned to Advocate:
            </span>
            <span className="mono" style={{ fontWeight: 700, color: "var(--text)" }}>
              {formatDateTime(caseRecord.assignedAt || caseRecord.createdAt)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
              ⏱️ Started Working:
            </span>
            {caseRecord.startedWorkingAt || caseRecord.status === "In Process" || caseRecord.status === "Completed" ? (
              <span className="mono" style={{ fontWeight: 700, color: "#16A34A" }}>
                {formatDateTime(caseRecord.startedWorkingAt || caseRecord.updatedAt)}
              </span>
            ) : (
              <span style={{ color: "var(--amber)", fontWeight: 600, fontSize: 11.5 }}>
                ⏳ Awaiting advocate to start
              </span>
            )}
          </div>

          {(caseRecord.startedWorkingAt || caseRecord.status === "In Process" || caseRecord.status === "Completed") && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 6,
                borderTop: "1px dashed var(--line)",
                fontSize: 11.5,
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Turnaround Time:</span>
              <span className="badge info" style={{ fontWeight: 700 }}>
                ⚡ {formatTurnaroundTime(caseRecord.assignedAt || caseRecord.createdAt, caseRecord.startedWorkingAt || caseRecord.updatedAt) || "Prompt response"}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="field" style={{ marginBottom: 0 }}>
        <label>Documents</label>
        <DocumentManager
          caseId={caseRecord.id}
          documents={caseRecord.documents || []}
          onChange={onDocumentsChange}
        />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        borderTop: "1px solid var(--line)",
        paddingTop: 10,
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ textAlign: "right", maxWidth: "65%" }}>
        {value || "—"}
      </span>
    </div>
  );
}
