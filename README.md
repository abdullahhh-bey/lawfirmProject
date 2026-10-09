# PLUG SOLICITORS CRM

PLUG SOLICITORS CRM is a secure, role-based legal operations platform designed for a modern law firm. It brings together client management, case intake, attorney assignment, task tracking, finance, messaging, and document handling in one system.

The application supports both an admin operations view and a separate lawyer portal, allowing the firm to manage internal workflows while giving advocates access to the matters assigned to them.

## Product overview

This system helps the firm to:

- manage a complete register of clients and matters
- track case lifecycle from intake to completion
- assign cases and tasks to specific lawyers
- monitor deadlines, statuses, and workload
- store and retrieve legal documents and attachments
- maintain financial ledgers for client billing and trust accounting
- communicate with clients and internal teams through messaging workflows
- keep audit-friendly records for operations and compliance

## Core feature list

### 1. Client management

- Maintain a full client directory with contact information, address, and notes.
- Add new clients and edit existing records from the admin interface.
- Search clients instantly by name, email, or phone number.
- View the total number of matters tied to each client.
- Open a dedicated client finance page for that client's billing activity.
- Open a complete case history page showing every matter linked to a client.

### 2. Case intake and case lifecycle management

- Create new matters from the case intake form.
- Generate structured legal case identifiers using the firm's case-type nomenclature.
- Link each matter to a client, a case type, and a legal matter description.
- Capture common case information, legal fee fields, and type-specific details where needed.
- Assign lawyers to matters and track status progression throughout the case lifecycle.
- Review and update case details from a dedicated case record screen.
- Move cases through operational statuses such as Unassigned, Assigned, Delivered, Seen, In Process, Completed, Archived, and Cancelled.
- Maintain a full case record history for operational visibility and auditability.

### 3. Client case history

- Open a client's full legal history from the client list.
- Show all matters for that client, regardless of active status, so the firm can review the complete relationship.
- Display each case with its ID, type, matter, assigned advocates, and current status.
- Navigate directly from each case in the history view into the detailed case record.
- Use the client history view as the single source for reviewing a client's entire portfolio of matters.

### 4. Advanced filtering and search

- Filter the main case list by case type.
- Search cases and client records with instant filtering.
- Group lawyer work by status in the lawyer portal.
- Review calendars and task lists by operational category and urgency.
- Quickly narrow the view to relevant matters without leaving the main workflow.

### 5. Task management

- Create tasks against specific matters.
- Assign tasks to one or multiple lawyers.
- Track task status and stage progression in the work queue.
- Review task attachments and task history from the case record.
- Support task creation, updates, status changes, and completion tracking.
- Restrict editing on sensitive closed cases while preserving read access where appropriate.

### 6. Lawyer portal and role-based access

- Provide a dedicated interface for advocates to view their assigned matters.
- Show lawyer case lists grouped by status, including in-progress, completed, and archived work.
- Allow lawyers to open individual case records and update approved actions.
- Keep admin and lawyer workflows separated while enabling shared operational visibility where appropriate.
- Enforce role-based access rules in the backend for security and accountability.

### 7. Document and attachment management

- Upload documents and attachments to cases, tasks, and messages.
- Store legal files and supporting material in a structured file system.
- Download or preview attached files when needed.
- Restrict unauthorized modifications on closed or protected matters.
- Manage attachments directly within task and case records without leaving the workflow.

### 8. Messaging and client communication

- Send internal and external messages from the communication module.
- Support direct messaging and broadcast-style campaigns.
- Attach files or supporting documents to messages.
- Track message activity and communication history.
- Integrate with WhatsApp-based messaging workflows for reminders and notifications.

### 9. Finance and billing controls

- Record client-ledger entries and financial transactions.
- Maintain office and client finance summaries.
- Review the ledger for each client and track outstanding balances.
- Generate and distribute client receipts.
- Trigger payment reminders to clients directly from the finance workflow.
- Keep invoice-style records and payment activity within the same case-management system.

### 10. Calendar and scheduling

- View legal work by calendar and timeline.
- Track tasks and deadlines in a simplified calendar view.
- Open case records directly from scheduled items.
- Support operational planning across matters, lawyers, and due dates.

### 11. Notifications and reminders

- Send assignment, follow-up, and reminder notifications to the relevant users.
- Trigger task reminder workflows based on upcoming deadlines.
- Notify lawyers when matters or tasks are assigned to them.
- Support communication workflows across administrative and legal staff.

### 12. Security, auditability, and compliance

- Use secure JWT authentication and role-based authorization.
- Protect sensitive legal information behind role-specific access rules.
- Enforce HTTPS and secure transport settings across the application.
- Use encrypted storage patterns and secure handling of confidential case and client data.
- Restrict changes to closed matters where those actions are not permitted.
- Provide access control boundaries between admin and lawyer roles.

## User roles

### Admin

The admin workspace is used for:

- client onboarding
- case creation and intake
- lawyer assignment
- task oversight
- finance tracking
- messaging and communication
- system-wide reporting and operational control

### Lawyer

The lawyer portal is used for:

- viewing assigned matters
- opening case details
- updating task and matter progress
- reviewing documents and attachments
- monitoring deadlines and communication
- completing work within the allowed operational status flow

## Technology stack

- React + Vite frontend
- ASP.NET Core Web API backend
- PostgreSQL via Supabase
- JWT-based authentication and authorization
- Cloud storage integration for legal documents and attachments
- Secure role-based access and encrypted data handling
- Swagger API documentation in development

## Getting started

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
dotnet restore
cd backend/lawfirm.backend
dotnet run
```

## Project purpose

PLUG SOLICITORS CRM is designed to help a law firm operate more efficiently by centralizing client, matter, task, finance, and communication workflows in a single system. The product balances operational control for the admin team with a practical, focused workspace for lawyers handling active files.

## Summary

This project implements a complete legal practice management workflow covering the full lifecycle of client and matter management. From initial client intake to final case closure, the platform supports what a modern law firm needs to run matters, supervise staff, manage billing, maintain communication, and keep important legal work organized and secure.
