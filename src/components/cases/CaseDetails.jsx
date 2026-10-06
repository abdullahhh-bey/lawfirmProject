import React from "react";
import { Link } from "react-router-dom";
import { caseTypeByCode } from "../../data/nomenclature.js";
import CaseStatus from "./CaseStatus.jsx";
import MultiLawyerSelector from "../lawyers/MultiLawyerSelector.jsx";
import DocumentManager from "../documents/DocumentManager.jsx";

export default function CaseDetails({
  caseRecord,
  lawyer,
  onReassign,
  onEditToggle,
  onDocumentsChange,
  feeReceived,
  clientId,
}) {
  const type = caseTypeByCode(caseRecord.caseTypeCode);
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
        <Row label="Matter" value={caseRecord.matter} />
        <Row label="Our Ref" value={caseRecord.ourRef} />
        <Row label="Opening Date" value={caseRecord.openingDate} />
        <Row label="Closing Date" value={caseRecord.closingDate || "—"} />
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
