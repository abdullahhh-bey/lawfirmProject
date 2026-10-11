// ================================================================
// API CLIENT - Connected to ASP.NET Core 8 Backend & Supabase
// ================================================================
import { CASE_TYPES, caseTypeByCode } from '../data/nomenclature.js';

export const API_BASE_URL = 'http://localhost:5067/api';

function getAuthToken() {
  try {
    const s = JSON.parse(sessionStorage.getItem('session') || 'null');
    return s?.token || null;
  } catch {
    return null;
  }
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = { ...(options.headers || {}) };

  if (options.body && !isFormData(options.body)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    let errMessage = 'An unexpected server error occurred.';
    try {
      const data = await res.json();
      errMessage = data.message || data.title || errMessage;
    } catch { /* ignore parse error */ }
    throw new Error(errMessage);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return null;
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ---------------- Auth ----------------
export const auth = {
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const session = {
      id: data.session?.id || data.id,
      name: data.session?.name || data.fullName || 'Admin',
      email: data.session?.email || data.email,
      role: (data.session?.role || data.role || 'lawyer').toLowerCase(),
      token: data.token,
    };

    sessionStorage.setItem('session', JSON.stringify(session));
    return session;
  },

  async changePassword(currentPassword, newPassword) {
    return await request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  logout() {
    sessionStorage.removeItem('session');
  },

  getSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem('session') || 'null');
      if (s) {
        s.role = (s.role || 'lawyer').toLowerCase();
      }
      return s;
    } catch {
      return null;
    }
  },
};

// ---------------- In-Flight & Short TTL Memory Cache (Prevents Stalled Connection Socket Bottlenecks) ----------------
const memoryCache = new Map();
const inFlightRequests = new Map();

export function clearCache() {
  memoryCache.clear();
  inFlightRequests.clear();
}

async function fetchWithCache(key, fetcher, ttlMs = 5000) {
  const now = Date.now();
  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key);
    if (now - cached.timestamp < ttlMs) {
      return cached.data;
    }
  }

  if (inFlightRequests.has(key)) {
    return await inFlightRequests.get(key);
  }

  const p = (async () => {
    try {
      const data = await fetcher();
      memoryCache.set(key, { data, timestamp: Date.now() });
      return data;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, p);
  return await p;
}

// ---------------- Clients ----------------
export const clients = {
  async list() {
    return await fetchWithCache('clients', async () => (await request('/clients')) || []);
  },

  async get(id) {
    return await fetchWithCache(`client_${id}`, async () => await request(`/clients/${id}`));
  },

  async create(data) {
    clearCache();
    return await request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    clearCache();
    return await request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async remove(id) {
    clearCache();
    return await request(`/clients/${id}`, {
      method: 'DELETE',
    });
  },
};

// ---------------- Helpers for data normalization ----------------
function transformCase(c) {
  if (!c) return c;
  let documents = [];
  try {
    const parsedDocuments = typeof c.documentsJson === 'string' ? JSON.parse(c.documentsJson) : c.documents;
    documents = Array.isArray(parsedDocuments)
      ? parsedDocuments.map((node) =>
          node && !node.kind && node.storagePath
            ? { ...node, kind: 'file' }
            : node,
        )
      : [];
  } catch {
    documents = [];
  }
  let piFields = {};
  try {
    piFields = typeof c.piFieldsJson === 'string' ? JSON.parse(c.piFieldsJson) : (c.piFields || {});
  } catch {
    piFields = {};
  }
  return {
    ...c,
    documents,
    piFields,
  };
}

function normalizeAttachmentMetadata(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;

  const normalized = {
    id: attachment.id || `att_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name: attachment.name || attachment.fileName || 'attachment',
    mimeType: attachment.mimeType || attachment.type || 'application/octet-stream',
    size: Number(attachment.size || 0),
  };

  if (attachment.storagePath) normalized.storagePath = attachment.storagePath;
  if (attachment.createdAt) normalized.createdAt = attachment.createdAt;
  if (attachment.parentId) normalized.parentId = attachment.parentId;
  if (attachment.url) normalized.url = attachment.url;
  if (attachment.dataUrl) normalized.dataUrl = attachment.dataUrl;

  return normalized;
}

function sanitizeAttachmentList(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map(normalizeAttachmentMetadata)
    .filter(Boolean);
}

function sanitizeDocumentTree(nodes = []) {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .filter((node) => node && typeof node === 'object')
    .map((node) => {
      const safeNode = { ...node };
      delete safeNode.dataUrl;
      delete safeNode.rawFile;
      delete safeNode.file;
      if (Array.isArray(node.children)) {
        safeNode.children = sanitizeDocumentTree(node.children);
      }
      return safeNode;
    });
}

function transformTask(t) {
  if (!t) return t;
  let attachments = [];
  try {
    attachments = typeof t.attachmentsJson === 'string' ? sanitizeAttachmentList(JSON.parse(t.attachmentsJson)) : sanitizeAttachmentList(t.attachments || []);
  } catch {
    attachments = [];
  }
  return {
    ...t,
    date: (t.date || '').slice(0, 10),
    attachments,
  };
}

// ---------------- Cases ----------------
export const cases = {
  async list() {
    return await fetchWithCache('cases', async () => {
      const list = (await request('/cases')) || [];
      return list.map(transformCase);
    });
  },

  async listByClient(clientId) {
    return await fetchWithCache(`cases_client_${clientId}`, async () => {
      const list = (await request(`/cases/client/${clientId}`)) || [];
      return list.map(transformCase);
    });
  },

  async listForLawyer(lawyerId) {
    const list = (await request('/cases')) || [];
    return list.map(transformCase);
  },

  async get(id) {
    return await fetchWithCache(`case_${id}`, async () => {
      const c = await request(`/cases/${id}`);
      return transformCase(c);
    });
  },

  async uploadDocument(caseId, file, folderId = null) {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const folderQuery = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
    const res = await fetch(`${API_BASE_URL}/cases/${caseId}/documents/upload${folderQuery}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      let errMessage = 'Failed to upload document.';
      try {
        const data = await res.json();
        errMessage = data.message || errMessage;
      } catch {}
      throw new Error(errMessage);
    }

    return await res.json();
  },

  async create(data) {
    clearCache('cases');
    const docsJson = JSON.stringify(sanitizeDocumentTree(data.documents || []));
    const res = await request('/cases', {
      method: 'POST',
      body: JSON.stringify({
        caseTypeCode: data.caseTypeCode,
        clientId: data.clientId,
        ourRef: data.ourRef || '',
        matter: data.matter || '',
        openingDate: data.openingDate || null,
        feeAgreed: Number(data.feeAgreed) || 0,
        piFieldsJson: JSON.stringify(data.piFields || {}),
        documentsJson: docsJson,
        assignedLawyerIds: data.assignedLawyerIds || (data.assignedLawyerId ? [data.assignedLawyerId] : []),
        notes: data.notes || '',
        tasks: (data.tasks || []).map(t => ({
          name: t.name,
          date: t.date,
          assignedLawyerIds: t.assignedLawyerIds || (t.assignedLawyerId ? [t.assignedLawyerId] : []),
          notes: t.notes || '',
        })),
      }),
    });

    const caseObj = transformCase(res?.case || res || {});
    return {
      ...caseObj,
      case: caseObj,
      tasks: (res?.tasks || []).map(transformTask),
    };
  },

  async update(id, data) {
    clearCache('cases');
    const res = await request(`/cases/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ourRef: data.ourRef,
        matter: data.matter,
        openingDate: data.openingDate || null,
        closingDate: data.closingDate || null,
        feeAgreed: Number(data.feeAgreed) || 0,
        piFieldsJson: typeof data.piFields === 'string' ? data.piFields : JSON.stringify(data.piFields || {}),
        notes: data.notes,
      }),
    });
    return transformCase(res);
  },

  async setDocuments(id, documents) {
    clearCache('cases');
    const docsJson = typeof documents === 'string'
      ? JSON.stringify(sanitizeDocumentTree(JSON.parse(documents)))
      : JSON.stringify(sanitizeDocumentTree(documents || []));
    const res = await request(`/cases/${id}/documents`, {
      method: 'PUT',
      body: JSON.stringify({ documentsJson: docsJson }),
    });
    return transformCase(res);
  },

  async deleteDocument(caseId, fileId) {
    return await request(`/cases/${caseId}/documents/${fileId}`, {
      method: 'DELETE',
    });
  },

  async assignLawyers(id, lawyerIds) {
    clearCache('cases');
    const res = await request(`/cases/${id}/assign-lawyers`, {
      method: 'PUT',
      body: JSON.stringify({ lawyerIds: lawyerIds || [] }),
    });
    return transformCase(res);
  },

  async setStatus(id, status) {
    clearCache('cases');
    const res = await request(`/cases/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return transformCase(res);
  },

  async remove(id) {
    clearCache('cases');
    return await request(`/cases/${id}`, {
      method: 'DELETE',
    });
  },
};

// ---------------- Tasks ----------------
export const tasks = {
  async listByCase(caseId) {
    return await fetchWithCache(`tasks_case_${caseId}`, async () => {
      const list = (await request(`/tasks?caseId=${caseId}`)) || [];
      return list.map(transformTask);
    });
  },

  async listForLawyer(lawyerId) {
    return await fetchWithCache(`tasks_lawyer_${lawyerId}`, async () => {
      const list = (await request('/tasks')) || [];
      return list.map(transformTask);
    });
  },

  async listAll() {
    return await fetchWithCache('tasks', async () => {
      const list = (await request('/tasks')) || [];
      return list.map(transformTask);
    });
  },

  async get(id) {
    const t = await request(`/tasks/${id}`);
    return transformTask(t);
  },

  async create(data) {
    clearCache('tasks');
    const res = await request('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        caseId: data.caseId,
        name: data.name,
        date: data.date,
        assignedLawyerIds: data.assignedLawyerIds || (data.assignedLawyerId ? [data.assignedLawyerId] : []),
        notes: data.notes || '',
        attachmentsJson: '[]',
      }),
    });
    const created = transformTask(res);
    const files = data.attachments || [];
    for (const file of files) {
      await this.uploadAttachment(created.id, file.rawFile || file.file || file);
    }
    return files.length ? await this.get(created.id) : created;
  },

  async update(id, data) {
    clearCache('tasks');
    const res = await request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        date: data.date,
        assignedLawyerIds: data.assignedLawyerIds || [],
        notes: data.notes || '',
        attachmentsJson: typeof data.attachments === 'string' ? data.attachments : JSON.stringify(sanitizeAttachmentList(data.attachments || [])),
      }),
    });
    return transformTask(res);
  },

  async setStatus(id, status) {
    clearCache('tasks');
    const res = await request(`/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return transformTask(res);
  },

  async remove(id) {
    clearCache('tasks');
    return await request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  async dueForReminder() {
    const all = await this.listAll();
    const in3 = new Date();
    in3.setDate(in3.getDate() + 3);
    const in3Str = in3.toISOString().slice(0, 10);
    return all.filter(t => (t.date || '').slice(0, 10) === in3Str && !t.reminderSent && t.status !== 'Completed');
  },

  async uploadAttachment(taskId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/attachments/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      let errMessage = 'Failed to upload task attachment.';
      try {
        const data = await res.json();
        errMessage = data.message || errMessage;
      } catch {}
      throw new Error(errMessage);
    }

    return await res.json();
  },

  async downloadAttachment(taskId, attachment) {
    const legacyUrl = attachment.dataUrl || attachment.url;
    if (legacyUrl) {
      const link = document.createElement('a');
      link.href = legacyUrl;
      link.download = attachment.name || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    if (!attachment.storagePath) {
      throw new Error('This attachment has no stored file. Remove it and attach the original file again.');
    }

    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(
      `${API_BASE_URL}/tasks/${taskId}/attachments/${encodeURIComponent(attachment.id)}/download`,
      { method: 'GET', credentials: 'include', headers },
    );

    if (!res.ok) {
      let errMessage = 'Failed to download task attachment.';
      try {
        const data = await res.json();
        errMessage = data.message || errMessage;
      } catch {}
      throw new Error(errMessage);
    }

    const objectUrl = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = attachment.name || 'attachment';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  },

  async addAttachments(id, files) {
    clearCache('tasks');
    const current = await this.get(id);
    const existing = sanitizeAttachmentList(current?.attachments || []);
    const uploaded = [];

    for (const file of files || []) {
      const uploadedFile = await this.uploadAttachment(id, file.rawFile || file.file || file);
      uploaded.push(uploadedFile);
    }

    const updated = [...existing, ...sanitizeAttachmentList(uploaded)];
    return await this.update(id, { ...current, attachments: updated });
  },

  async deleteAttachment(taskId, attachmentId) {
    return await request(`/tasks/${taskId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  },
};

// ---------------- Lawyers / employees ----------------
export const lawyers = {
  async list() {
    return await fetchWithCache('lawyers', async () => (await request('/lawyers')) || []);
  },

  async get(id) {
    return await fetchWithCache(`lawyer_${id}`, async () => await request(`/lawyers/${id}`));
  },

  async create(data) {
    clearCache();
    return await request('/lawyers', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        password: data.password || 'password',
      }),
    });
  },

  async update(id, data) {
    clearCache();
    return await request(`/lawyers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        password: data.password || null,
      }),
    });
  },

  async toggleActive(id) {
    clearCache();
    return await request(`/lawyers/${id}/toggle-active`, {
      method: 'PUT',
    });
  },

  async remove(id) {
    clearCache();
    return await request(`/lawyers/${id}`, {
      method: 'DELETE',
    });
  },
};

function transformMessage(m) {
  if (!m) return m;
  let attachments = [];
  try {
    attachments = typeof m.attachmentsJson === 'string' ? sanitizeAttachmentList(JSON.parse(m.attachmentsJson)) : sanitizeAttachmentList(m.attachments || []);
  } catch {
    attachments = [];
  }
  return {
    ...m,
    attachments,
    recipientStatus: m.recipientStatus || {},
  };
}

// ---------------- Messaging ----------------
export const messaging = {
  async list() {
    return await fetchWithCache('messaging', async () => {
      const list = (await request('/messaging')) || [];
      return list.map(transformMessage);
    });
  },

  async uploadAttachment(file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/messaging/attachments/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      let errMessage = 'Failed to upload message attachment.';
      try {
        const data = await res.json();
        errMessage = data.message || errMessage;
      } catch {}
      throw new Error(errMessage);
    }

    return await res.json();
  },

  async send({ recipientIds, text, attachments }) {
    clearCache();
    const storedAttachments = await Promise.all((attachments || []).map(async (attachment) => {
      if (attachment.storagePath) return attachment;

      let file = attachment.rawFile || attachment.file;
      if (!file && attachment.dataUrl) {
        const response = await fetch(attachment.dataUrl);
        const blob = await response.blob();
        file = new File([blob], attachment.name || 'attachment', {
          type: attachment.mimeType || attachment.type || blob.type,
        });
      }

      if (!file) {
        throw new Error(`The file "${attachment.name || 'attachment'}" is no longer available. Please attach it again.`);
      }

      return await this.uploadAttachment(file);
    }));

    const sanitizedAttachments = sanitizeAttachmentList(storedAttachments).map(({ id, name, mimeType, size, storagePath, createdAt, parentId }) => ({
      id, name, mimeType, size, ...(storagePath ? { storagePath } : {}), ...(createdAt ? { createdAt } : {}), ...(parentId ? { parentId } : {}),
    }));

    const res = await request('/messaging', {
      method: 'POST',
      body: JSON.stringify({
        recipientIds: recipientIds || [],
        text: text || '',
        attachmentsJson: JSON.stringify(sanitizedAttachments),
      }),
    });
    return transformMessage(res);
  },

  async deleteAttachment(storagePath) {
    return await request(`/messaging/attachments?storagePath=${encodeURIComponent(storagePath)}`, {
      method: 'DELETE',
    });
  },

  async downloadAttachment(attachment) {
    const legacyUrl = attachment.dataUrl || attachment.url;
    if (legacyUrl) {
      const link = document.createElement('a');
      link.href = legacyUrl;
      link.download = attachment.name || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    if (!attachment.storagePath) {
      throw new Error('This attachment has no stored file. Ask the sender to attach it again.');
    }

    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = new URLSearchParams({ storagePath: attachment.storagePath });
    const res = await fetch(
      `${API_BASE_URL}/messaging/attachments/download?${params}`,
      { method: 'GET', credentials: 'include', headers },
    );

    if (!res.ok) {
      let errMessage = 'Failed to download message attachment.';
      try {
        const data = await res.json();
        errMessage = data.message || errMessage;
      } catch {}
      throw new Error(errMessage);
    }

    const objectUrl = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = attachment.name || 'attachment';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  },

  async markSeen(messageId, lawyerId) {
    clearCache();
    return await request(`/messaging/${messageId}/seen`, {
      method: 'PUT',
    });
  },

  async listForLawyer(lawyerId) {
    return await fetchWithCache('messaging', async () => {
      const list = (await request('/messaging')) || [];
      return list.map(transformMessage);
    });
  },
};

// ---------------- Notifications ----------------
export const notifications = {
  async list() {
    return await fetchWithCache('notifications', async () => {
      try {
        return (await request('/messaging/notifications')) || [];
      } catch {
        return [];
      }
    });
  },
  async listForLawyer(lawyerId) {
    return await fetchWithCache('notifications', async () => {
      try {
        return (await request('/messaging/notifications')) || [];
      } catch {
        return [];
      }
    });
  },
};

function transformSummary(r) {
  if (!r) return r;
  const client = r.client || {
    id: r.clientId,
    name: r.clientName || 'Client',
    phone: r.clientPhone || '',
  };
  return {
    ...r,
    client,
    agreed: Number(r.agreed) || 0,
    officeBalance: Number(r.officeBalance) || 0,
    clientBalance: Number(r.clientBalance) || 0,
    outstanding: Number(r.outstanding) || 0,
    lastActivity: r.lastActivity ? String(r.lastActivity).slice(0, 10) : '—',
  };
}

// ---------------- Finance ----------------
export const finance = {
  async listForClient(clientId) {
    return (await request(`/finance/client/${clientId}`)) || [];
  },

  async summaries() {
    const list = (await request('/finance/summaries')) || [];
    return list.map(transformSummary);
  },

  async create(data) {
    return await request('/finance', {
      method: 'POST',
      body: JSON.stringify({
        clientId: data.clientId,
        caseId: data.caseId || null,
        account: data.account || 'office',
        date: data.date || new Date().toISOString(),
        reference: data.reference || '',
        particulars: data.particulars || '',
        description: data.description || '',
        type: data.type || 'IN',
        amount: Number(data.amount) || 0,
      }),
    });
  },

  async remove(id) {
    return await request(`/finance/${id}`, {
      method: 'DELETE',
    });
  },
};

// ---------------- WhatsApp ----------------
export const whatsApp = {
  async getStatus() {
    try {
      return await request('/whatsapp/status');
    } catch {
      return { isConfigured: false };
    }
  },
  async sendMessage({ phoneNumber, message }) {
    return await request('/whatsapp/send-message', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, message }),
    });
  },
  async sendFile({ phoneNumber, file, caption }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('phoneNumber', phoneNumber);
    if (caption) formData.append('caption', caption);

    const token = getAuthToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/whatsapp/send-file`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errMessage = 'Failed to send WhatsApp file.';
      try {
        const data = await res.json();
        errMessage = data.message || errMessage;
      } catch {}
      throw new Error(errMessage);
    }
    return await res.json();
  },
};

export { CASE_TYPES, caseTypeByCode };

