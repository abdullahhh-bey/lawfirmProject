import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth } from "../lib/api.js";

const AppContext = createContext(null);

function humanizeErrorMessage(rawMsg) {
  if (!rawMsg) return "An unexpected issue occurred. Please try again.";
  const str = String(rawMsg);

  if (/failed to fetch|networkerror|load resource|err_connection/i.test(str)) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }
  if (/413|request entity too large/i.test(str)) {
    return "File size exceeds the maximum limit (50MB). Please select a smaller file.";
  }
  if (/storage path is missing|no stored file/i.test(str)) {
    return "This file does not have an active cloud record. Please re-upload the document.";
  }
  if (/unauthorized|401/i.test(str)) {
    return "Your session has expired. Please log in again to continue.";
  }
  if (/forbidden|403/i.test(str)) {
    return "You do not have permission to perform this action.";
  }
  if (/bad request|400/i.test(str) && !str.includes(":")) {
    return "Invalid request. Please verify your information and try again.";
  }
  return str;
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(() => auth.getSession());
  const [toast, setToast] = useState(null);

  // Error and success popup goes away automatically after exactly 4 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((message, type = "success") => {
    const formatted = type === "error" ? humanizeErrorMessage(message) : message;
    setToast({ message: formatted, type, key: Date.now() });
  }, []);

  const login = useCallback(async (email, password) => {
    const s = await auth.login(email, password);
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    void auth.logout();
    setSession(null);
  }, []);

  return (
    <AppContext.Provider value={{ session, login, logout, showToast }}>
      {children}
      {toast && (
        <aside
          key={toast.key}
          className={`toast ${toast.type}`}
          role="status"
          aria-live="polite"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 440,
            lineHeight: 1.45,
          }}
        >
          <span style={{ fontSize: 16 }}>
            {toast.type === "error" ? "⚠️" : "✓"}
          </span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              opacity: 0.7,
              fontSize: 14,
              cursor: "pointer",
              padding: "0 4px",
              marginLeft: 4,
            }}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </aside>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
