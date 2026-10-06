# Plug Solicitor — Law Firm Case & Client Management (Frontend)

A React frontend for the firm's case/client management system, built on the
architecture and messaging patterns from the existing admin panel (zone
broadcasts, WhatsApp/Green API notifications, REST-style API client) and the
firm's real case fields and filing nomenclature.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # production build to dist/
```

Demo accounts (see `src/lib/api.js` → `seed()`):

- Admin: `admin@firm.com` / `admin`
- Advocate: `s.jennings@firm.com` / `password`

This build ships with a **mock backend** (`src/lib/api.js`) that persists to
`localStorage` so the whole app works standalone for demos and review. It is
written to the exact same shape a real backend client would use (see below),
so wiring up a real server is a contained change.

## Architecture

```
src/
  data/nomenclature.js     Case-type nomenclature (exact firm abbreviations),
                            Case ID generation rules, status enums
  lib/api.js                Mock REST client — auth, clients, cases, tasks,
                            lawyers, messaging, notifications
  lib/whatsapp.js            WhatsApp message templating + send stub
  context/AppContext.jsx     Session + toast notifications
  components/
    layout/                 Sidebar, Topbar, ProtectedRoute (role-gated)
    ui/                     StatusBadge, Modal, ConfirmDialog, EmptyState
    clients/                ClientForm, ClientDetails
    cases/                  CaseForm, CaseStatus, CaseDetails
    lawyers/                LawyerSelector, LawyerList
    tasks/                  TaskCard, TaskList, TaskStatus
    calendar/               Calendar
    messaging/              MessageComposer, BroadcastComposer, NotificationStatus
  pages/                    One page per route (Dashboard, Cases, Create Case,
                            Case Details, Clients, Calendar, Lawyers,
                            Messaging, Lawyer Portal + sub-pages)
```

`TaskCard`/`TaskList` are the single reusable task components used in Create
Case (draft, editable, removable), Case Details (persisted, status +
reassignment), and the Lawyer Portal (Start Working / Mark Completed).

## What's new since the first build

- **Fixed:** Add/Edit Client (and the same bug in Lawyers) — the modal's
  Cancel/✕ only cleared one of two pieces of state, so it never actually
  closed. Both now close correctly.
- **Lawyers page:** each row now has Message, Edit, Activate/Deactivate, and
  Delete actions. Delete asks for confirmation, then un-assigns that lawyer
  from any cases (falls back to Unassigned) and removes them from any tasks
  rather than leaving broken references.
- **File attachments everywhere a message, case, or task is created:**
  `AttachmentInput`/`AttachmentList` (`components/ui/`) let you attach
  images or any file to: case documents (Create Case + Case Details),
  individual/broadcast messages, and tasks. Images preview inline; other
  files show as a named download chip.
- **Tasks can now be assigned to multiple lawyers** — `task.assignedLawyerIds`
  is an array, edited with the new `MultiLawyerSelector`. Every assigned
  lawyer gets their own assignment notification, sees the task in their
  portal, and can view its attachments. (Case-level assignment stays
  single-lawyer, per the original spec — only _tasks_ support multiple.)

These file attachments are stored as base64 in the same mock localStorage
database as everything else — see the note at the top of `lib/api.js` about
why a real backend must instead upload to real file storage.

## Case ID generation

`src/data/nomenclature.js` holds the **exact** case-type abbreviations from
the firm's Filing Nomenclature register (Fam, Anc, Lit, Imm, PI, Evic, Comm)
plus their folder colors and filing codes. `cases.create()` in `lib/api.js`
looks up the abbreviation for the selected case type and appends a
per-type sequential counter, e.g. `FAM-001`, `FAM-002`, `PI-001`. The Case ID
is generated once, stored on the case record, and every `cases.update()` call
strips any `caseId` field from the patch — it can never be overwritten by an
edit.

The firm's existing case register fields (Fee Agreed, Fee Received, S1, S2,
Med Fee, Engr Fee, VD, Storage, Hire) are modelled as common fee fields plus
a Personal Injury–RTA–specific field group (`piFields`), shown only when
Case Type = PI, matching how those fields appear only on RTA files today.

## Status workflow

Case status: `Unassigned → Assigned → Delivered → Seen → In Process → Completed`
Task status uses the same set. Rules encoded in `lib/api.js` / page logic:

- Assigning a lawyer moves a case to `Assigned`, then `Delivered` once the
  (simulated) WhatsApp notification succeeds.
- Opening the case in the Lawyer Portal (`LawyerCaseView.jsx`) moves
  `Delivered → Seen` automatically, but **never** auto-advances to `In Process`.
- Only the lawyer's explicit "Start Working" action moves a case/task to
  `In Process`.

## WhatsApp / notification integration

`lib/whatsapp.js` defines the exact assignment message template from the
spec and a `sendWhatsAppNotification()` call. **This must be backed by a
real server-side integration in production** (Green API or WhatsApp Business
API, as used in the reference admin panel) — the credentials and the actual
HTTP call to Meta/Green API should never live in the browser. Likewise, the
3-day task reminder (`tasks.dueForReminder()`) must be driven by a backend
cron/queue job, not a frontend timer, so reminders fire even when nobody has
the app open, per the spec.

## Going from mock to a real backend

Every page calls the functions exported from `src/lib/api.js` — never
`localStorage` directly. To connect a real backend:

1. Replace the body of each function in `api.js` with a `fetch(API_BASE_URL + '/path', ...)`
   call (see the comment at the top of the file for the pattern used in the
   existing admin panel's `js/api.js`).
2. Keep the same function names/shapes so no page code needs to change.
3. Move `auth.login` to return a real bearer token; store/send it exactly as
   `js/api.js`'s `_request()` helper does today.

## Security & confidentiality

Per the proposal's requirements, the important rule is: **client-side role
checks (like `ProtectedRoute`) are a UX convenience, not access control.**
The real backend must:

- Authenticate every request (bearer token) and authorize it per-role/per-assignment
  server-side — a lawyer's token should only ever be able to fetch cases/clients/tasks
  they are assigned to, mirrored here by `cases.listForLawyer()` /
  `tasks.listForLawyer()`, which must be enforced again in the API, not just the UI.
- Never expose another lawyer's confidential case data through a shared
  endpoint — scope every query by the authenticated user's assignments.
- Log access to confidential case/client records for auditability.
- Serve all traffic over HTTPS/TLS, and store documents/attachments with
  encryption at rest.
