// Source of truth: firm's Filing Nomenclature register.
// `code` drives the auto-generated Case ID (e.g. FAM-001, FAM-002…).
// `filingCode` and `color` are the firm's physical folder-color system,
// kept for reference on the case (color-coded badge in the UI).
export const CASE_TYPES = [
  { code: 'FAM',  label: 'Family – Divorce and Children',        color: 'green',  filingCode: '100001' },
  { code: 'ANC',  label: 'Ancillary – Financial Settlement',      color: 'green',  filingCode: '200001' },
  { code: 'LIT',  label: 'Litigation – Money Matters, Employment', color: 'yellow', filingCode: '300001' },
  { code: 'IMM',  label: 'Immigration',                           color: 'blue',   filingCode: '400001' },
  { code: 'PI',   label: 'Personal Injury – RTA',                 color: 'yellow', filingCode: '500001' },
  { code: 'EVIC', label: 'Landlord & Tenant – Eviction',          color: 'buff',   filingCode: '600001' },
  { code: 'COMM', label: 'Landlord & Tenant – Lease',             color: 'buff',   filingCode: '700001' },
];

export function caseTypeByCode(code) {
  return CASE_TYPES.find(c => c.code === code) || null;
}

// Case-type-specific financial fields, taken from the firm's existing case
// register (Med fee / Engr fee / VD / Storage / Hire / S1 / S2 are specific
// to PI–RTA files; every case type also gets the common fee fields).
export const PI_EXTRA_FIELDS = [
  { key: 's1', label: 'S1' },
  { key: 's2', label: 'S2' },
  { key: 'medFee', label: 'Med Fee' },
  { key: 'engrFee', label: 'Engr Fee' },
  { key: 'vd', label: 'VD (Vehicle Damage)' },
  { key: 'storage', label: 'Storage' },
  { key: 'hire', label: 'Hire' },
];

export const CASE_STATUSES = ['Unassigned', 'Assigned', 'In Process', 'Completed', 'Cancelled', 'Archived'];
export const TASK_STATUSES = ['Pending', 'Assigned', 'Delivered', 'Seen', 'In Process', 'Completed'];

export function statusToClass(status) {
  return (status || '').toLowerCase().replace(/\s+/g, '');
}
