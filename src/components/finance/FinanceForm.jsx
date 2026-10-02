import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { caseTypeByCode } from '../../data/nomenclature.js';

const empty = { caseId: '', account: 'office', date: new Date().toISOString().slice(0, 10), type: 'IN', amount: '', reference: '', particulars: '', description: '' };

export default function FinanceForm({ client, cases, onClose, onSave, saving }) {
  const [draft, setDraft] = useState(empty);
  const [error, setError] = useState('');
  const set = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }));

  const selectedCase = cases.find(c => c.id === draft.caseId);

  async function submit() {
    if (!draft.amount || Number(draft.amount) <= 0) { setError('Enter an amount greater than zero.'); return; }
    setError('');
    await onSave({ ...draft, clientId: client.id });
  }

  return (
    <Modal title="Record Payment" sub={`For ${client.name}`} onClose={onClose} maxWidth="520px">
      {/* Client identity is fetched automatically, not re-typed. */}
      <div className="field">
        <label>Client</label>
        <div style={{ background: 'var(--surface-2)', border: '1.5px solid var(--line)', borderRadius: 9, padding: '10px 13px', fontSize: 13.5 }}>
          {client.name} <span style={{ color: 'var(--text-muted)' }}>· {client.phone}</span>
        </div>
      </div>

      <div className="field">
        <label>Case / File (optional)</label>
        <select value={draft.caseId} onChange={set('caseId')}>
          <option value="">General — not tied to a specific case</option>
          {cases.map(c => {
            const t = caseTypeByCode(c.caseTypeCode);
            return <option key={c.id} value={c.id}>{c.caseId} · {t?.label || c.caseTypeCode} — {c.matter || 'No matter set'}</option>;
          })}
        </select>
        {selectedCase && (
          <div className="field-hint">
            Fee agreed: {selectedCase.feeAgreed ? `Rs ${Number(selectedCase.feeAgreed).toLocaleString()}` : '—'}
          </div>
        )}
      </div>

      <div className="field">
        <label>Account</label>
        <div className="radio-pair">
          <button type="button" className={`radio-opt${draft.account === 'office' ? ' active' : ''}`} onClick={() => setDraft(d => ({ ...d, account: 'office' }))}>Office Account (Fee)</button>
          <button type="button" className={`radio-opt${draft.account === 'client' ? ' active' : ''}`} onClick={() => setDraft(d => ({ ...d, account: 'client' }))}>Client Account (Trust Money)</button>
        </div>
        <div className="field-hint">
          {draft.account === 'client'
            ? "Client's own money held on their behalf — advances or disbursements not yet earned as fee."
            : 'Professional fee money the firm has earned or billed.'}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Type</label>
          <div className="radio-pair">
            <button type="button" className={`radio-opt${draft.type === 'IN' ? ' active' : ''}`} onClick={() => setDraft(d => ({ ...d, type: 'IN' }))}>Money In</button>
            <button type="button" className={`radio-opt${draft.type === 'OUT' ? ' active' : ''}`} onClick={() => setDraft(d => ({ ...d, type: 'OUT' }))}>Money Out</button>
          </div>
        </div>
        <div className="field">
          <label>Amount</label>
          <input type="number" placeholder="0" value={draft.amount} onChange={set('amount')} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Date</label>
          <input type="date" value={draft.date} onChange={set('date')} />
        </div>
        <div className="field">
          <label>Reference</label>
          <input placeholder="Receipt / voucher no." value={draft.reference} onChange={set('reference')} />
        </div>
      </div>

      <div className="field">
        <label>Particulars</label>
        <input placeholder="e.g. Second installment against fee" value={draft.particulars} onChange={set('particulars')} />
      </div>

      <div className="field" style={{ marginBottom: error ? 6 : 0 }}>
        <label>Description / Notes</label>
        <textarea rows={2} placeholder="Optional detail…" value={draft.description} onChange={set('description')} />
      </div>
      {error && <div className="err-text">{error}</div>}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</button>
      </div>
    </Modal>
  );
}
