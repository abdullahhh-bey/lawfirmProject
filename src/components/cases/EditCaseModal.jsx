import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal.jsx";
import MultiLawyerSelector from "../lawyers/MultiLawyerSelector.jsx";
import { caseTypeByCode, PI_EXTRA_FIELDS } from "../../data/nomenclature.js";
import { cases as casesApi, clients as clientsApi } from "../../lib/api.js";
import SubmitProgress from "../ui/SubmitProgress.jsx";

export default function EditCaseModal({
  caseRecord,
  client,
  onClose,
  onSave,
}) {
  const [allClients, setAllClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [clientId, setClientId] = useState(caseRecord.clientId || client?.id || "");
  const [legacyCaseId, setLegacyCaseId] = useState(caseRecord.legacyCaseId || "");
  const [ourRef, setOurRef] = useState(caseRecord.ourRef || "");
  const [matter, setMatter] = useState(caseRecord.matter || "");
  const [closingDate, setClosingDate] = useState(
    caseRecord.closingDate ? caseRecord.closingDate.slice(0, 10) : ""
  );
  const [feeAgreed, setFeeAgreed] = useState(caseRecord.feeAgreed || 0);
  const [piFields, setPiFields] = useState(caseRecord.piFields || {});
  const [notes, setNotes] = useState(caseRecord.notes || "");
  const [assignedLawyerIds, setAssignedLawyerIds] = useState(
    caseRecord.assignedLawyerIds || []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    clientsApi.list().then((list) => {
      if (active) {
        setAllClients(list || []);
        setLoadingClients(false);
      }
    }).catch(() => {
      if (active) setLoadingClients(false);
    });
    return () => { active = false; };
  }, []);

  const selectedType = caseTypeByCode(caseRecord.caseTypeCode);

  const handlePiChange = (key, val) => {
    setPiFields((prev) => ({ ...prev, [key]: val }));
  };

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!matter.trim()) {
      setError("Please provide a matter / description.");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const payload = {
        clientId: clientId || undefined,
        legacyCaseId: legacyCaseId.trim() || null,
        ourRef: ourRef.trim(),
        matter: matter.trim(),
        closingDate: closingDate || null,
        feeAgreed: Number(feeAgreed) || 0,
        piFields,
        notes: notes.trim(),
        assignedLawyerIds,
      };

      const updated = await casesApi.update(caseRecord.id, payload);
      onSave(updated);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update case.");
    } finally {
      setSaving(false);
    }
  }

  const formattedStartDate = caseRecord.openingDate
    ? new Date(caseRecord.openingDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <Modal
      title={`Edit Case: ${caseRecord.caseId}`}
      sub="Admin can update client, previous case ID, matter, closing date, fee, advocates, and notes."
      maxWidth="680px"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        {error && <div className="err-banner">{error}</div>}

        {/* Locked permanent case attributes banner */}
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "12px 14px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Case ID (Permanent)
            </div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--accent)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              {caseRecord.caseId}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Case Type (Permanent)
            </div>
            <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
              {selectedType && (
                <span className={`folder-chip ${selectedType.color}`}>
                  {selectedType.color.toUpperCase()}
                </span>
              )}
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {selectedType?.label || caseRecord.caseTypeCode}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Start Date (Permanent)
            </div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 2 }}>
              📅 {formattedStartDate}
            </div>
          </div>
        </div>

        <div className="field">
          <label>
            Client <span className="req">*</span>
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={loadingClients || saving}
            required
          >
            {loadingClients ? (
              <option value="">Loading clients…</option>
            ) : (
              allClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="field">
          <label>
            Previous Case ID / Physical File Ref{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 12 }}>
              (Optional — for existing/backlog cases)
            </span>
          </label>
          <input
            placeholder="e.g. OLD-FAM-042 or 2022/CIVIL/109"
            value={legacyCaseId}
            onChange={(e) => setLegacyCaseId(e.target.value)}
            maxLength={100}
            disabled={saving}
          />
        </div>

        <div className="field">
          <label>
            Matter / Description <span className="req">*</span>
          </label>
          <input
            placeholder="e.g. Divorce proceedings, Immigration appeal..."
            value={matter}
            onChange={(e) => setMatter(e.target.value)}
            disabled={saving}
            required
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Our Reference</label>
            <input
              placeholder="Internal reference"
              value={ourRef}
              onChange={(e) => setOurRef(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="field">
            <label>Closing Date</label>
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="field">
          <label>Fee Agreed (£)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={feeAgreed}
            onChange={(e) => setFeeAgreed(e.target.value)}
            disabled={saving}
          />
        </div>

        {caseRecord.caseTypeCode === "PI" && (
          <div style={{ background: "var(--surface-2)", padding: 12, borderRadius: 10 }}>
            <div className="section-hint" style={{ marginTop: 0, marginBottom: 8, fontWeight: 600 }}>
              Personal Injury – Specific Fields
            </div>
            <div className="field-row-3">
              {PI_EXTRA_FIELDS.map((f) => (
                <div className="field" key={f.key}>
                  <label>{f.label}</label>
                  <input
                    value={piFields[f.key] || ""}
                    onChange={(e) => handlePiChange(f.key, e.target.value)}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label>Assigned Advocate(s)</label>
          <MultiLawyerSelector
            value={assignedLawyerIds}
            onChange={setAssignedLawyerIds}
          />
        </div>

        <div className="field">
          <label>Notes / Updates</label>
          <textarea
            rows={3}
            placeholder="Latest notes on case..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
          />
        </div>

        {saving && <SubmitProgress label="Saving changes…" />}

        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
