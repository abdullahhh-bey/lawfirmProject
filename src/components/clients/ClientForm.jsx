import React from 'react';

export default function ClientForm({ value, onChange, errors = {} }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="form-section">
      <h3>Client Information</h3>
      <div className="section-hint">Basic details for the individual or organization this case is opened for.</div>
      <div className="field">
        <label>Full Name <span className="req">*</span></label>
        <input placeholder="e.g. Michael Turner" value={value.name} onChange={set('name')} />
        {errors.name && <div className="err-text">{errors.name}</div>}
      </div>
      <div className="field-row">
        <div className="field">
          <label>Phone Number <span className="req">*</span></label>
          <input placeholder="e.g. 923001234567" value={value.phone} onChange={set('phone')} />
          {errors.phone && <div className="err-text">{errors.phone}</div>}
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="client@example.com" value={value.email} onChange={set('email')} />
        </div>
      </div>
      <div className="field">
        <label>Address</label>
        <textarea rows={2} placeholder="Street / Area / City" value={value.address} onChange={set('address')} />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Notes</label>
        <textarea rows={2} placeholder="Any additional client information…" value={value.notes} onChange={set('notes')} />
      </div>
    </div>
  );
}
