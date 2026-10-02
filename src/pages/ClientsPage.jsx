import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar.jsx';
import Modal from '../components/ui/Modal.jsx';
import ClientForm from '../components/clients/ClientForm.jsx';
import { clients as clientsApi, cases as casesApi } from '../lib/api.js';
import { useApp } from '../context/AppContext.jsx';

export default function ClientsPage() {
  const nav = useNavigate();
  const { showToast } = useApp();
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // client object or {} for new
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  function reload() {
    Promise.all([clientsApi.list(), casesApi.list()]).then(([c, cs]) => { setClients(c); setCases(cs); });
  }
  useEffect(reload, []);

  const rows = useMemo(() => clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase())), [clients, q]);
  const caseCountFor = (clientId) => cases.filter(c => c.clientId === clientId).length;

  function openEdit(client) {
    setEditing(client);
    setDraft(client ? { ...client } : { name: '', phone: '', email: '', address: '', notes: '' });
  }

  // Was only clearing `editing`, leaving `draft` set — since the modal's
  // visibility check is `{draft && (...)}`, it never actually unmounted.
  function closeModal() {
    setEditing(null);
    setDraft(null);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing?.id) {
        await clientsApi.update(editing.id, draft);
        showToast('Client updated.');
      } else {
        await clientsApi.create(draft);
        showToast('Client created.');
      }
      closeModal();
      reload();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Clients</h1>
            <div className="sub">{clients.length} client{clients.length === 1 ? '' : 's'} on file.</div>
          </div>
          <button className="btn btn-primary" onClick={() => openEdit(null)}>+ Add Client</button>
        </div>

        <input
          placeholder="Search clients by name…"
          value={q} onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 320, marginBottom: 16, background: 'var(--surface-2)', border: '1.5px solid var(--line)', color: 'var(--text)', padding: '10px 13px', borderRadius: 9, fontSize: 13.5 }}
        />

        <div className="table-wrap">
          <table>
            <thead><tr><th>Client</th><th>Phone</th><th>Address</th><th>Cases</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr className="empty-row"><td colSpan={5}>No clients match this search.</td></tr>}
              {rows.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-main">
                      <div className="avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                      <div><div className="cell-name">{c.name}</div><div className="cell-sub">{c.email || '—'}</div></div>
                    </div>
                  </td>
                  <td className="mono">{c.phone}</td>
                  <td>{c.address || '—'}</td>
                  <td>{caseCountFor(c.id)}</td>
                  <td>
                    <div className="row-actions" style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => nav(`/finance/${c.id}`)} title="View Finance Ledger">
                        Finance
                      </button>
                      <button className="icon-btn-sm" onClick={() => openEdit(c)} title="Edit Client">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {draft && (
        <Modal title={editing?.id ? 'Edit Client' : 'Add Client'} onClose={closeModal} maxWidth="520px">
          <ClientForm value={draft} onChange={setDraft} />
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
