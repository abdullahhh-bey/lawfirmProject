import React from 'react';

export default function LoadingSpinner({ message = 'Hold on, Data is coming for you' }) {
  return (
    <div className="spinner-container">
      <div className="spinner-ring" />
      <div className="spinner-text">{message}</div>
    </div>
  );
}
