// ================================================================
// WHATSAPP NOTIFICATION SERVICE
// ================================================================
// Mirrors the Green API integration pattern used in the firm's existing
// admin panel (js/whatsapp.js): a business WhatsApp number, configured per
// firm, sends templated messages. Credentials are never hard-coded — they
// come from Settings (kept here as env-style placeholders) and every call
// goes through the firm's own backend in production (see api.js notes).
//
// IMPORTANT: real WhatsApp delivery must happen server-side (Green API /
// WhatsApp Business API calls need a secret token and should be triggered
// by the backend's task/notification scheduler, not the browser — this is
// why section 6 of the spec says reminders must not be a frontend timer).
// This module defines the *shape* of that integration for the frontend:
// building the message, calling the backend endpoint, and reflecting the
// delivery status it returns.

export function buildAssignmentMessage({ lawyerName, clientName, caseId, taskName, taskDate }) {
  return [
    `Hello ${lawyerName},`,
    ``,
    `A new task has been assigned to you on the Law Firm Portal.`,
    ``,
    `Client: ${clientName}`,
    `Case ID: ${caseId}`,
    `Task: ${taskName || '—'}`,
    `Date: ${taskDate || '—'}`,
    ``,
    `Please log in to the portal to view the complete details.`,
    ``,
    `Thank you.`,
  ].join('\n');
}

export function buildReminderMessage({ lawyerName, clientName, caseId, taskName, taskDate, kind }) {
  const label = kind || 'Task';
  return [
    `Hello ${lawyerName},`,
    ``,
    `${label} reminder — this is due in 3 days.`,
    ``,
    `Client: ${clientName}`,
    `Case ID: ${caseId}`,
    `Task: ${taskName || '—'}`,
    `Date: ${taskDate || '—'}`,
    ``,
    `Please log in to the portal for full details.`,
  ].join('\n');
}

// Simulated send — in production this posts to `${API_BASE_URL}/notifications/send`
// on the backend, which itself calls Green API / WhatsApp Business API with the
// firm's stored instance credentials, then webhooks delivery/seen status back.
export async function sendWhatsAppNotification({ phone, message }) {
  await new Promise(r => setTimeout(r, 350 + Math.random() * 400));
  if (!phone) throw new Error('No phone number on file for this recipient.');
  // Simulated delivery outcome for the demo build.
  return { status: 'Delivered', sentAt: new Date().toISOString() };
}
