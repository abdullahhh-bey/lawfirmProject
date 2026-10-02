import React from 'react';
import TaskCard from './TaskCard.jsx';
import EmptyState from '../ui/EmptyState.jsx';

export default function TaskList({ tasks, mode = 'full', caseMetaFor, lawyerNameOf, onChange, onRemove, onStatusChange, onStartWorking, onAddAttachments, onAdd, emptyLabel = 'No tasks yet.' }) {
  return (
    <div>
      {tasks.length === 0 && mode !== 'draft' && <EmptyState title={emptyLabel} />}
      {tasks.map((task, i) => (
        <TaskCard
          key={task.id || i}
          task={task}
          mode={mode}
          caseMeta={caseMetaFor?.(task)}
          lawyerNameOf={lawyerNameOf}
          onChange={(t) => onChange?.(i, t)}
          onRemove={() => onRemove?.(i, task)}
          onStatusChange={(s) => onStatusChange?.(task, s)}
          onStartWorking={() => onStartWorking?.(task)}
          onAddAttachments={onAddAttachments ? (files) => onAddAttachments(task, files) : undefined}
        />
      ))}
      {mode === 'draft' && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Add Another Task
        </button>
      )}
    </div>
  );
}
