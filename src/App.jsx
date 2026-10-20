import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "./context/AppContext.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";

import Login from "./pages/Login.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import CreateCase from "./pages/CreateCase.jsx";
import CasesPage from "./pages/CasesPage.jsx";
import CaseDetailsPage from "./pages/CaseDetailsPage.jsx";
import ClientsPage from "./pages/ClientsPage.jsx";
import ClientCaseHistoryPage from "./pages/ClientCaseHistoryPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import FinancePage from "./pages/FinancePage.jsx";
import ClientFinancePage from "./pages/ClientFinancePage.jsx";
import LawyersPage from "./pages/LawyersPage.jsx";
import MessagingPage from "./pages/MessagingPage.jsx";
import LawyerPortal from "./pages/LawyerPortal.jsx";
import LawyerCaseView from "./pages/LawyerCaseView.jsx";
import LawyerCalendarPage from "./pages/LawyerCalendarPage.jsx";
import LawyerMessagesPage from "./pages/LawyerMessagesPage.jsx";

export default function App() {
  const { session } = useApp();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          session ? (
            <Navigate
              to={session.role === "admin" ? "/dashboard" : "/portal"}
              replace
            />
          ) : (
            <Login />
          )
        }
      />

      {/* Admin */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases"
        element={
          <ProtectedRoute role="admin">
            <CasesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/new"
        element={
          <ProtectedRoute role="admin">
            <CreateCase />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <ProtectedRoute role="admin">
            <CaseDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute role="admin">
            <ClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:clientId/history"
        element={
          <ProtectedRoute role="admin">
            <ClientCaseHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute role="admin">
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <ProtectedRoute role="admin">
            <FinancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/:clientId"
        element={
          <ProtectedRoute role="admin">
            <ClientFinancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/advocates"
        element={
          <ProtectedRoute role="admin">
            <LawyersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lawyers"
        element={<Navigate to="/advocates" replace />}
      />
      <Route
        path="/messaging"
        element={
          <ProtectedRoute role="admin">
            <MessagingPage />
          </ProtectedRoute>
        }
      />

      {/* Lawyer portal */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute role="lawyer">
            <LawyerPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/cases/:id"
        element={
          <ProtectedRoute role="lawyer">
            <LawyerCaseView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/calendar"
        element={
          <ProtectedRoute role="lawyer">
            <LawyerCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/messages"
        element={
          <ProtectedRoute role="lawyer">
            <LawyerMessagesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={
              session
                ? session.role === "admin"
                  ? "/dashboard"
                  : "/portal"
                : "/login"
            }
            replace
          />
        }
      />
    </Routes>
  );
}
