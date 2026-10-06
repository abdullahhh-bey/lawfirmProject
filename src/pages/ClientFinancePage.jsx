import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Topbar from "../components/layout/Topbar.jsx";
import FinanceChart from "../components/finance/FinanceChart.jsx";
import FinanceForm from "../components/finance/FinanceForm.jsx";
import FinanceLedgerTable from "../components/finance/FinanceLedgerTable.jsx";
import ReceiptModal from "../components/finance/ReceiptModal.jsx";
import ClientPaymentReminderModal from "../components/clients/ClientPaymentReminderModal.jsx";
import {
  clients as clientsApi,
  cases as casesApi,
  finance as financeApi,
} from "../lib/api.js";
import { useApp } from "../context/AppContext.jsx";

import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";

export default function ClientFinancePage() {
  const { clientId } = useParams();
  const nav = useNavigate();
  const { showToast } = useApp();

  const [client, setClient] = useState(null);
  const [cases, setCases] = useState([]);
  const [rows, setRows] = useState([]);
  const [account, setAccount] = useState("office"); // which of the two Excel-style ledgers is shown
  const [showForm, setShowForm] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptEntry, setReceiptEntry] = useState(null);

  async function reload() {
    const [cl, allCases, ledger] = await Promise.all([
      clientsApi.get(clientId),
      casesApi.list(),
      financeApi.listForClient(clientId),
    ]);
    setClient(cl);
    setCases(allCases.filter((c) => c.clientId === clientId));
    setRows(ledger);
  }
  useEffect(() => {
    reload();
  }, [clientId]);

  if (!client) {
    return (
      <>
        <Topbar />
        <LoadingSpinner text="Hold on, Data is coming for you" />
      </>
    );
  }

  const officeRows = rows.filter((r) => (r.account || "office") === "office");
  const clientRows = rows.filter((r) => r.account === "client");
  const received = officeRows
    .filter((r) => r.type === "IN")
    .reduce((s, r) => s + Number(r.amount), 0);
  const refunded = officeRows
    .filter((r) => r.type === "OUT")
    .reduce((s, r) => s + Number(r.amount), 0);
  const officeBalance = received - refunded;
  const clientIn = clientRows
    .filter((r) => r.type === "IN")
    .reduce((s, r) => s + Number(r.amount), 0);
  const clientOut = clientRows
    .filter((r) => r.type === "OUT")
    .reduce((s, r) => s + Number(r.amount), 0);
  const clientBalance = clientIn - clientOut;
  const agreed = cases.reduce((s, c) => s + (Number(c.feeAgreed) || 0), 0);
  const outstanding = Math.max(agreed - officeBalance, 0);
  const caseIdFor = (caseId) => cases.find((c) => c.id === caseId)?.caseId;
  const visibleRows = rows.filter((r) => (r.account || "office") === account);

  async function saveEntry(data) {
    setSaving(true);

    try {
      const created = await financeApi.create(data);

      const rawEntry = created || data;

      const amount = Number(rawEntry.amount ?? 0);

      const sameLedgerRows = rows.filter((r) => {
        const sameAccount =
          (r.account || "office") === (rawEntry.account || "office");

        const sameCase = (r.caseId || "") === (rawEntry.caseId || "");

        return sameAccount && sameCase;
      });

      const previousBalance =
        sameLedgerRows.length > 0
          ? Number(sameLedgerRows[sameLedgerRows.length - 1].balance ?? 0)
          : 0;

      const delta = rawEntry.type === "OUT" ? -amount : amount;

      const apiBalance = Number(rawEntry.balance);

      const normalizedEntry = {
        ...rawEntry,

        amount,

        balance: Number.isFinite(apiBalance)
          ? apiBalance
          : previousBalance + delta,
      };

      setRows((prev) => [...prev, normalizedEntry]);

      showToast(
        `${normalizedEntry.type === "OUT" ? "Refund" : "Payment"} recorded.`,
      );

      setShowForm(false);

      setReceiptEntry(normalizedEntry);
    } catch (e) {
      showToast(e.message || "Failed to record payment.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(row) {
    if (!window.confirm("Remove this ledger entry?")) return;
    try {
      await financeApi.remove(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      showToast("Entry removed.");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  return (
    <>
      <Topbar />
      <div className="page">
        <div className="page-head">
          <div>
            <button
              className="link"
              onClick={() => nav("/finance")}
              style={{ fontSize: 12, marginBottom: 6, display: "inline-block" }}
            >
              ← All Finance
            </button>
            <h1>
              {client.name}{" "}
              <span
                style={{
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  fontSize: 15,
                }}
              >
                · {client.phone}
              </span>
            </h1>
            <div className="sub">
              {cases.length} case{cases.length === 1 ? "" : "s"} on file · Case
              ID and client name are fetched automatically when you record a
              payment.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn btn-ghost"
              style={{ color: "#25D366", borderColor: "#25D366" }}
              onClick={() => setShowReminderModal(true)}
            >
              💬 WhatsApp Payment Reminder
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              + Record Payment
            </button>
          </div>
        </div>

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="card stat-card">
            <div className="stat-label">Fee Agreed</div>
            <div className="stat-value">£ {agreed.toLocaleString("en-GB")}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Office Account Balance</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>
              £ {officeBalance.toLocaleString("en-GB")}
            </div>
            <div className="stat-sub">
              Received £ {received.toLocaleString("en-GB")} · Out £{" "}
              {refunded.toLocaleString("en-GB")}
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Client Account Balance</div>
            <div className="stat-value" style={{ color: "var(--blue)" }}>
              £ {clientBalance.toLocaleString("en-GB")}
            </div>
            <div className="stat-sub">Money held for the client, not fee</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Outstanding (vs. fee agreed)</div>
            <div className="stat-value" style={{ color: "var(--amber)" }}>
              £ {outstanding.toLocaleString("en-GB")}
            </div>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab${account === "office" ? " active" : ""}`}
            onClick={() => setAccount("office")}
          >
            Office Account
          </button>
          <button
            className={`tab${account === "client" ? " active" : ""}`}
            onClick={() => setAccount("client")}
          >
            Client Account
          </button>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-head">
            <h3>
              Payment History —{" "}
              {account === "client" ? "Client Account" : "Office Account"}
            </h3>
          </div>
          <div className="section-hint" style={{ marginTop: -8 }}>
            Balance resets per case, the same as each matter's block in the
            firm's ledger — a new case always starts at zero.
          </div>
          <FinanceChart rows={visibleRows} caseIdFor={caseIdFor} />
        </div>

        <div className="card-head" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 700 }}>
            Ledger —{" "}
            {account === "client" ? "Client Account" : "Office Account"}
          </h3>
        </div>
        <FinanceLedgerTable
          rows={visibleRows}
          caseIdFor={caseIdFor}
          onRemove={removeEntry}
        />
      </div>

      {showForm && (
        <FinanceForm
          client={client}
          cases={cases}
          saving={saving}
          onClose={() => setShowForm(false)}
          onSave={saveEntry}
        />
      )}

      {showReminderModal && (
        <ClientPaymentReminderModal
          client={client}
          cases={cases}
          outstanding={outstanding}
          onClose={() => setShowReminderModal(false)}
          onSent={() => showToast("Payment reminder sent to client WhatsApp.")}
        />
      )}

      {receiptEntry && (
        <ReceiptModal
          client={client}
          caseId={caseIdFor(receiptEntry.caseId)}
          entry={receiptEntry}
          totalAgreed={agreed}
          officeBalance={officeBalance}
          onClose={() => setReceiptEntry(null)}
          onSent={() => showToast("Receipt sent to client WhatsApp.")}
        />
      )}
    </>
  );
}
