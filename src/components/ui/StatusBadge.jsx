import React from 'react';
import { statusToClass } from '../../data/nomenclature.js';

// One shared status pill used for case status, task status, and message
// delivery status everywhere in the app (Admin dashboard, Case Details,
// Calendar, Lawyer Portal) so the color language stays consistent.
export default function StatusBadge({ status }) {
  if (!status) return <span className="badge unassigned">—</span>;
  return <span className={`badge ${statusToClass(status)}`}>{status}</span>;
}
