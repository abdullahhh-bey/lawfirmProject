import React from 'react';
import { CASE_TYPES, caseTypeByCode, PI_EXTRA_FIELDS } from '../../data/nomenclature.js';
import AttachmentInput from '../ui/AttachmentInput.jsx';

export default function CaseForm({ value, onChange, caseIdPreview, errors = {} }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const setPi = (k) => (e) => onChange({ ...value, piFields: { ...value.piFields, [k]: e.target.value } });
  const type = caseTypeByCode(value.caseTypeCode);

  return (
    <div className="form-section">
      <h3>Case Information</h3>
      <div className="section-hint">Case type drives the automatic Case ID — the exact nomenclature from the firm's filing register.</div>

      <div className="field-row">
        <div className="field">
          <label>Case Type <span className="req">*</span></label>
          <select value={value.caseTypeCode} onChange={set('caseTypeCode')}>
            <option value="">Select case type…</option>
            {CASE_TYPES.map(t => <option key={t.code} value={t.code}>{t.label} ({t.code})</option>)}
          </select>
          {errors.caseTypeCode && <div className="err-text">{errors.caseTypeCode}</div>}
        </div>
        <div className="field">
          <label>Case ID</label>
          <div style={{ background: 'var(--surface-2)', border: '1.5px dashed var(--line)', borderRadius: 9, padding: '10px 13px', fontFamily: 'var(--font-mono)', color: value.caseTypeCode ? 'var(--accent)' : 'var(--text-muted)', fontSize: 13.5, fontWeight: 700 }}>
            {value.caseTypeCode ? caseIdPreview : 'Select a case type to preview'}
          </div>
          <div className="field-hint">Auto-generated sequential CRM ID.</div>
        </div>
      </div>

      <div className="field">
        <label>
          Previous Case ID / Physical File Ref{" "}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>
            (Optional — for existing/backlog cases)
          </span>
        </label>
        <input
          placeholder="e.g. OLD-FAM-042 or 2022/CIVIL/109"
          value={value.legacyCaseId || ''}
          onChange={set('legacyCaseId')}
          maxLength={100}
        />
        <div className="field-hint">
          If this case already had an ID from your previous case register or paper file, enter it here. You can search by either ID anywhere in the CRM.
        </div>
      </div>

      {type && (
        <div style={{ marginBottom: 15 }}>
          <span className={`folder-chip ${type.color}`}>{type.color.toUpperCase()} FOLDER · Filing Code {type.filingCode}</span>
        </div>
      )}

      <div className="field">
        <label>Matter / Description</label>
        <input placeholder="e.g. Divorce proceedings" value={value.matter} onChange={set('matter')} />
      </div>

      <div className="field-row-3">
        <div className="field">
          <label>Our Ref</label>
          <input placeholder="Internal reference" value={value.ourRef} onChange={set('ourRef')} />
        </div>
        <div className="field">
          <label>Opening Date</label>
          <input type="date" value={value.openingDate} onChange={set('openingDate')} />
        </div>
        <div className="field">
          <label>Closing Date</label>
          <input type="date" value={value.closingDate || ''} onChange={set('closingDate')} />
        </div>
      </div>

      <div className="field">
        <label>Fee Agreed</label>
        <input type="number" placeholder="0" value={value.feeAgreed} onChange={set('feeAgreed')} />
        <div className="field-hint">Payments received are tracked separately on the client's Finance page, not here.</div>
      </div>

      {value.caseTypeCode === 'PI' && (
        <>
          <div className="section-hint" style={{ marginTop: 4 }}>Personal Injury – RTA fields (from the firm's case register)</div>
          <div className="field-row-3">
            {PI_EXTRA_FIELDS.map(f => (
              <div className="field" key={f.key}>
                <label>{f.label}</label>
                <input value={value.piFields?.[f.key] || ''} onChange={setPi(f.key)} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="field">
        <label>Update / Notes</label>
        <textarea rows={2} placeholder="Latest update on this case…" value={value.notes} onChange={set('notes')} />
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label>Case Documents</label>
        <div className="field-hint" style={{ marginTop: 0, marginBottom: 8 }}>Attach filing documents, contracts, or evidence for this case.</div>
        <AttachmentInput value={value.attachments || []} onChange={(files) => onChange({ ...value, attachments: files })} label="Attach case document(s)" />
      </div>
    </div>
  );
}
