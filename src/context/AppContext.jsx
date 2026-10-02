import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/api.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [session, setSession] = useState(() => auth.getSession());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const login = useCallback(async (email, password) => {
    const s = await auth.login(email, password);
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setSession(null);
  }, []);

  return (
    <AppContext.Provider value={{ session, login, logout, showToast }}>
      {children}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
