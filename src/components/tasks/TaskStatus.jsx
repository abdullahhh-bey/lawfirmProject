import React from 'react';
import StatusBadge from '../ui/StatusBadge.jsx';

// Thin wrapper kept as its own component (per the reusable-architecture
// requirement) in case task-status ever needs rules distinct from case
// status (e.g. different color mapping) down the line.
export default function TaskStatus({ status }) {
  return <StatusBadge status={status} />;
}
