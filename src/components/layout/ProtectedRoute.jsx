import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import Sidebar from './Sidebar.jsx';

// role: 'admin' | 'lawyer' | undefined (any authenticated role)
export default function ProtectedRoute({ role, children }) {
  const { session } = useApp();
  if (!session) return <Navigate to="/login" replace />;
  if (role && session.role !== role) {
    return <Navigate to={session.role === 'admin' ? '/dashboard' : '/portal'} replace />;
  }
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-col">
        {children}
        <footer className="app-footer">
          <span>Made by FutureSort Technologies</span>
        </footer>
      </div>
    </div>
  );
}
