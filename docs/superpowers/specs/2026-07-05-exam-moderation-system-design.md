# Exam Moderation System — Product and Technical Design

**Date:** 2026-07-05  
**Status:** Approved design  
**Implementation plan:** `docs/superpowers/plans/2026-07-05-exam-moderation-system-plan.md`  
**Institution:** Tunku Abdul Rahman University of Management and Technology  
**Initial faculty:** Faculty of Engineering and Technology (FOET)

## 1. Purpose

Build a secure web application that manages the complete examination-paper moderation process from subject assignment through printing acknowledgement. The system replaces email-and-form coordination with an auditable workflow while retaining the supplied institutional forms and Gmail notifications.

The application must be deterministic to implement: workflow transitions, permissions, validation, form fields, storage rules, email behavior, and verification requirements are specified below. Implementers must not invent alternative behavior where this document is explicit.

## 2. Success Criteria

The first release succeeds when:

1. Administrators can configure academic years and sessions, manage users, assign all workflow participants, and import assignments from Excel.
2. Course leaders can submit the four required deliverables and one COBE HTTPS URL before the first-submission deadline.
3. Every moderation stage can proceed or return the case according to the exact workflow in this document.
4. Returned cases can be revised without repeating completed earlier stages.
5. All submissions, revisions, comments, decisions, notifications, and file accesses are attributable and timestamped.
6. Only administrators and assigned participants can access case data or documents.
7. Uploaded PDFs are validated, stored privately in Cloudflare R2, and previewed in the application.
8. The confirmation-for-printing form prints as an A4 pixel-matched reproduction of the supplied template.
9. Gmail delivery failures never corrupt or roll back workflow state.
10. The system supports approximately 100 users, 300 subject cases per session, three sessions per year, and seven years of retention.

## 3. Scope

### 3.1 Included

- React single-page application
- Google-only sign-in through Convex Auth
- `@tarc.edu.my` domain restriction
- Disabled-by-default user provisioning
- Academic year, session, subject, user, and assignment administration
- Excel template download and all-or-nothing batch import
- Course-leader draft and submission workflow
- Moderator, finalizer, team, dean/DD, examiner, and printing stages
- Immutable revisions and stage history
- Structured question-paper and marking-scheme cover forms
- Structured and printable confirmation-for-printing form
- Private Cloudflare R2 PDF storage and browser preview
- In-application Gmail OAuth and asynchronous notifications
- Basic role-aware dashboards and filters
- Audit logs, file-access logs, and seven-year retention eligibility
- Responsive desktop-first interface and WCAG 2.2 AA baseline

### 3.2 Excluded from the first release

- Multiple faculties in active use; the schema remains faculty-aware for future expansion
- Dark mode
- Malware scanning
- Advanced analytics such as turnaround-time trends and return-rate analysis
- Automatic deletion immediately at the seven-year boundary
- PDF export of the question-paper or marking-scheme cover forms
- Public file links or email attachments
- Configurable/custom workflow definitions
- Administrator impersonation or acting for an assigned reviewer

## 4. Required Technology and Conventions

### 4.1 Stack

| Concern | Required technology |
|---|---|
| Package manager | Bun only |
| Frontend | React, TypeScript strict mode, Vite |
| Styling | Tailwind CSS and shadcn/ui |
| Routing | TanStack Router file-based routing |
| Forms | React Hook Form using `Controller`, with Zod validation |
| Client UI state | Zustand; do not duplicate authoritative server state |
| Icons | Lucide |
| Backend and database | Convex |
| Authentication | Convex Auth with Google OAuth |
| Object storage | Cloudflare R2 through its S3-compatible API |
| PDF preview | PDF.js-based React integration |
| Tables | TanStack Table with shadcn rendering where appropriate |
| Tests | Vitest, `convex-test`, and a browser test runner |

### 4.2 Coding rules

- Organize frontend code by feature rather than file type.
- Keep focused files at or below approximately 300 lines where practical.
- Use shadcn/ui components before creating custom primitives.
- Use TanStack Router `<Link>` for internal navigation; never use raw `<a href>` for internal routes.
- Trim all text in client Zod schemas and again before server persistence.
- Every Convex function must validate arguments and return values.
- Every protected Convex function must call the shared authorization layer before accessing data.
- Use `getAuthUserId(ctx)` from `@convex-dev/auth/server`; do not use the identity subject as the application user ID.
- Use indexes rather than Convex query filters.
- Bound or paginate collection queries.
- Use separate child tables for unbounded history; do not store growing history arrays in one document.
- Use soft deactivation for users and reusable administrative entities.
- Use `import type` for type-only imports.
- Follow the Convex function, schema, authorization, indexing, pagination, action-runtime, scheduling, testing, and storage constraints stated in this specification and its implementation plan.
- Do not read or modify secret `.env` files. Document required keys in `.env.example` only.

## 5. Architecture

Use an explicit workflow state machine with immutable revision history. Do not build a generic configurable workflow engine.

### 5.1 System boundaries

**React SPA** owns presentation, local form state, drag-and-drop interactions, client validation, and route guards. It never serves as the authoritative authorization or workflow layer.

**Convex** owns identity linkage, authorization, academic data, assignment data, workflow state, revisions, structured forms, decisions, comments, audit records, email queue state, and dashboard counters.

**Cloudflare R2** owns uploaded PDF bytes. Objects are private and addressed by opaque keys recorded in Convex.

**Google OAuth and Gmail API** provide sign-in and faculty sender authorization. Authentication OAuth and Gmail OAuth are separate grants with separate scopes and records.

### 5.2 Backend module boundaries

Use focused backend modules for:

- Authentication callbacks and user provisioning
- Authorization helpers and case-access policies
- Academic years and sessions
- Subjects and assignments
- Imports
- Moderation cases and workflow transitions
- Revisions and structured forms
- R2 upload, validation, preview, and cleanup
- Stage decisions and team rounds
- Printing confirmation
- Gmail connections, email jobs, and delivery attempts
- Dashboard counters
- Audit and retention operations

All mutations that change workflow state must use one shared transition service. UI components and unrelated backend modules must not patch case status directly.

## 6. Identity and Authorization

### 6.1 Sign-in and provisioning

1. Offer Google sign-in only.
2. Reject accounts whose normalized email does not end in `@tarc.edu.my`.
3. Normalize email addresses to lowercase before lookup.
4. If a disabled placeholder exists for the email, link the Google identity to that record.
5. If no user exists, create a disabled user record.
6. If the email equals the configured bootstrap-administrator email, grant administrator access.
7. All other new users remain disabled until activated by an administrator.
8. A disabled user may authenticate but may access only the pending-access page and sign-out action.

### 6.2 Roles and responsibilities

Responsibilities are assignment-based and may overlap for one user across different cases.

| Responsibility | Authority |
|---|---|
| Administrator | Manage configuration and inspect all cases; cannot act for workflow participants |
| Course leader | Create drafts, submit, and respond to returns for assigned cases |
| Moderator | Review assigned cases at moderator stage |
| Finalizer | Review assigned cases at finalizer stage |
| Team moderator | Review an assigned team round |
| Dean/DD | Perform final moderation and complete the DECA portion of printing confirmation |
| Examiner/Chief Examiner | Complete the examiner portion of printing confirmation |
| Printing staff | Acknowledge receipt for printing |

The administrator capability is global. Other responsibilities come from subject assignments or printing assignments. A user may hold several responsibilities, but the server must evaluate the responsibility in the context of the requested case and action.

### 6.3 Access rules

- Administrators may read every case, revision, comment, form, audit record, and document.
- Administrators may not submit a moderation decision, examiner confirmation, DECA confirmation, or printing acknowledgement unless separately assigned that responsibility.
- Assigned participants may read the complete case history necessary to perform their work.
- Course leaders may edit only during `draft` or a returned state.
- Reviewers may decide only when the case is awaiting their stage and they are assigned.
- Unrelated active users receive no case metadata and no signed file URL.
- Disabled users receive no application data.
- Every upload ticket, upload finalization, preview URL, print action, export, query, mutation, and action enforces authorization server-side.
- Frontend route guards are usability controls, not security controls.

## 7. Academic Model and Assignments

### 7.1 Academic hierarchy

The hierarchy is:

`Faculty → Academic Year → Academic Session → Subject Assignment → Moderation Case`

Academic years use the form `YYYY/YYYY`, for example `2025/2026`.

Session codes are restricted to six digits ending in `01`, `05`, or `09`, for example `202601`, `202605`, and `202609`. A validation rule must reject other suffixes.

### 7.2 Subject definition

A subject contains:

- Course code: exactly four ASCII letters followed by four digits, normalized to uppercase
- Course title: required trimmed text
- Faculty ownership
- Active/deactivated state

### 7.3 Assignment definition

One assignment contains:

- Faculty, academic year, and session
- Subject
- Examination type: `main`, `resit`, or `repeat`
- Study level: `bachelor` or `diploma`
- Course leader: exactly one
- Moderator: exactly one
- Finalizer: exactly one
- Team moderators: zero or more, without duplicates
- Dean/DD: exactly one
- Examiner/Chief Examiner: exactly one
- First-submission deadline and `Asia/Kuala_Lumpur` timezone semantics
- Active/deactivated state

The same subject may have multiple cases in one session when examination type or another assignment identity differs. Assignments become immutable once their case receives its first submission. Reassignment after that point is excluded from the first release.

## 8. Workflow State Machine

### 8.1 Case statuses

Use this exact status vocabulary:

1. `draft`
2. `awaiting_moderator`
3. `returned_by_moderator`
4. `awaiting_finalizer`
5. `returned_by_finalizer`
6. `awaiting_team`
7. `returned_by_team`
8. `awaiting_dean`
9. `returned_by_dean`
10. `awaiting_examiner_confirmation`
11. `awaiting_deca_confirmation`
12. `awaiting_printing_acknowledgement`
13. `closed`

### 8.2 Forward transitions

| Current state | Actor/action | Next state |
|---|---|---|
| `draft` | Course leader submits first revision | `awaiting_moderator` |
| `awaiting_moderator` | Moderator proceeds | `awaiting_finalizer` |
| `awaiting_finalizer` | Finalizer proceeds, no team assigned | `awaiting_dean` |
| `awaiting_finalizer` | Finalizer proceeds, team assigned | `awaiting_team` |
| `awaiting_team` | Last required team member proceeds | `awaiting_dean` |
| `awaiting_dean` | Dean/DD proceeds | `awaiting_examiner_confirmation` |
| `awaiting_examiner_confirmation` | Examiner confirms | `awaiting_deca_confirmation` |
| `awaiting_deca_confirmation` | Dean/DD confirms | `awaiting_printing_acknowledgement` |
| `awaiting_printing_acknowledgement` | Printing staff acknowledges | `closed` |

### 8.3 Return transitions

| Current state | Actor/action | Next state | Course-leader resubmission target |
|---|---|---|---|
| `awaiting_moderator` | Moderator returns | `returned_by_moderator` | `awaiting_moderator` |
| `awaiting_finalizer` | Finalizer returns | `returned_by_finalizer` | `awaiting_finalizer` |
| `awaiting_team` | Any team member returns | `returned_by_team` | `awaiting_team` |
| `awaiting_dean` | Dean/DD returns | `returned_by_dean` | `awaiting_dean` |

Printing-confirmation stages do not return the underlying academic documents. A correction to printing metadata must be made within its controlled form section before that section is confirmed.

### 8.4 Team moderation

- Zero team members causes the finalizer transition to skip directly to dean/DD.
- One or more team members creates a team review round for the current revision.
- Every assigned member must proceed before the case advances.
- Any assigned member may return the case immediately.
- A return closes that team round without deleting decisions already made.
- Course-leader resubmission creates a new team round; every assigned team member must decide again.
- Earlier rounds remain immutable in history.

### 8.5 Decision comments

- Present one overall-comments textarea in the current-stage action panel.
- A non-blank trimmed comment is required when returning a case.
- A comment is optional when proceeding.
- Do not create per-document comment navigation.
- Display every decision and comment in one chronological timeline on the case page.

### 8.6 Locking and concurrency

- A successful first submission locks that revision immediately.
- A returned case unlocks only the course-leader editing capabilities allowed by the returned state.
- A successful resubmission creates and locks a new immutable revision.
- When dean/DD proceeds from `awaiting_dean`, all submission content becomes permanently immutable.
- Printing-confirmation data remains editable only within the actor's current section until that actor confirms it.
- Each transition verifies current case status, current revision, assignment, actor, and expected version in the database transaction.
- A stale or duplicate action fails with a conflict error and does not generate a second decision or email.

## 9. Deadlines and Reopening

- The configured timestamp is the deadline for the first course-leader submission only.
- Compare deadlines using `Asia/Kuala_Lumpur` semantics and store a canonical UTC timestamp plus the source timezone.
- Returned revisions remain resubmittable after the original deadline.
- After the deadline, an unsubmitted assignment cannot be submitted.
- An administrator may reopen only a selected assignment.
- Reopening requires a new deadline and a non-blank reason.
- Preserve each reopening as an immutable history record with administrator and timestamp.
- Reopening generates an email to the course leader and relevant assigned participants.

## 10. Submission Contents and Revision History

### 10.1 Required contents

Every submitted revision must contain:

1. Question paper PDF
2. Marking scheme PDF
3. Complete structured question-paper cover form
4. Complete structured marking-scheme cover form
5. A syntactically valid HTTPS COBE URL

Each PDF has an independent maximum size of 10 MB.

### 10.2 Draft behavior

- Allow drag-and-drop and file-picker upload.
- Allow explicit `Save draft` without submitting.
- Warn before leaving with unsaved structured-form changes.
- Permit deleting and replacing draft files.
- Show upload, validation, and readiness status independently for each file.
- A draft is not visible as a review task and does not send workflow email.

### 10.3 Revision snapshots

Every submitted revision records:

- Monotonic revision number beginning at 0 for the first submission
- Submission timestamp
- Submitting course leader
- Receiving stage
- References to both required PDF file records
- Complete snapshots of both structured cover forms
- COBE URL
- Which file/form values changed relative to the prior revision
- Lock status

Unchanged documents may reference the same immutable R2 object; changed documents receive new objects. Never overwrite a permanent R2 object in place.

## 11. Structured Institutional Forms

The three supplied PNG files are authoritative visual/content references and must remain in `forms/`.

### 11.1 Question-paper cover form

Render these fields in the interface:

- Static form metadata: `TAR/FOET/F/CO/11`, revision 02, effective date 24.11.2022
- Institution and faculty headings
- Examination type: Main, Resit, or Repeat
- Academic year
- Level: Bachelor or Diploma
- Semester/session
- Course code and title
- Course leader name
- Up to four examiner names
- Submission date, derived from the submitted revision
- Whether special instructions are included
- Number of questions submitted
- Up to eight attachment descriptions and corresponding page counts
- Total attachment pages, validated against entered rows
- Authenticated signatory name and timestamp

The form is a structured web form only. It does not require standalone PDF export.

### 11.2 Marking-scheme cover form

Render these fields in the interface:

- Static form metadata: `TAR/FOET/F/CO/12`, revision 02, effective date 24.11.2022
- Institution and faculty headings
- Examination type
- Academic year
- Level
- Semester/session
- Course code and title
- Course leader name
- Up to four examiner names
- Submission date, derived from the submitted revision
- Number of model answers/solutions submitted
- Whether suggested mark allocations are clearly indicated
- Authenticated signatory name and timestamp

The form is a structured web form only. It does not require standalone PDF export.

### 11.3 Confirmation-for-printing form

Store structured data for every field represented by `forms/confirmation printing form.png`:

- Static form metadata: `TAR/DECA/P-1/FM-2`, revision 5
- Academic year and session
- Faculty/centre
- Course code and title
- Six checklist rows from the template
- Examiner/Chief Examiner in-order responses
- A4 attachment yes/no, document details, and page count
- A3 attachment yes/no, document details, and page count
- Examiner name, authenticated signature, and date
- DECA Officer-in-Charge first-submission/revision responses and remarks
- Format-acceptable responses for First Submission, Revision 1, and Revision 2
- Revision resubmission dates and authenticated signatures
- DECA Officer-in-Charge name
- Printing Section recipient and received date

The examiner completes the examiner section. The assigned dean/DD completes the DECA section. Assigned printing staff completes the acknowledgement section.

### 11.4 Exact print behavior

- Use a dedicated A4 print document opened separately from the React application DOM.
- Match the supplied template's text, borders, column widths, row heights, spacing, and page placement pixel-for-pixel at the agreed test viewport and print scale.
- Populate academic and participant details from authoritative case data.
- Render authenticated approvals as printed names and timestamps; do not use drawn or uploaded signatures.
- The base template represents First Submission, Revision 1, and Revision 2.
- Revision cycles are not limited. If more than two revisions must be represented, print an additional identical continuation form for each subsequent group of up to three submissions.
- Continuation pages retain the same layout and clearly identify their absolute revision numbers without altering the base template geometry.
- The printing visual-regression test compares the rendered A4 output to the supplied reference image.

## 12. Cloudflare R2 File Lifecycle

### 12.1 Object states

Use these logical object states:

- `quarantined`: uploaded but not accepted
- `validated`: passed PDF checks and available for draft attachment
- `permanent`: referenced by a submitted immutable revision
- `orphaned`: no longer referenced by a draft and eligible for cleanup
- `purge_eligible`: related case has exceeded retention

### 12.2 Upload flow

1. An authorized course leader requests an upload ticket for a specific case and document kind.
2. Convex creates a short-lived presigned R2 upload URL and opaque quarantine key.
3. The browser uploads directly to R2.
4. The browser requests server-side finalization using the ticket, not an arbitrary object key.
5. A server action downloads enough or all of the object to validate it safely within platform constraints.
6. Validation checks the 10 MB limit, PDF magic bytes, parseability, corruption, and encryption/password protection.
7. On success, record immutable metadata including size, content type, hash, key, uploader, and validation timestamp.
8. On failure, delete the R2 object and return a stable validation error.

Do not trust browser MIME type, filename extension, client-reported size, or client-side PDF parsing as the authoritative validation.

### 12.3 Preview and download

- The client requests a preview URL for a specific file record.
- Convex verifies case access before issuing the URL.
- Generate a short-lived signed R2 URL; never persist it in the database.
- Record the access event with user, case, file, action, and timestamp.
- Render the PDF in an embedded PDF.js-based viewer in the case workspace.
- Do not expose bucket names, credentials, or reusable public URLs.

### 12.4 Cleanup

- Scheduled cleanup deletes expired quarantine objects and orphaned draft objects after a defined safety interval.
- Submitted revision objects are never deleted through draft cleanup.
- Purging after retention must remove R2 objects only after database eligibility and reference checks succeed.

## 13. Gmail OAuth and Email Delivery

### 13.1 Faculty sender connection

- Store one active Gmail sender connection per faculty.
- Provide an administrator-only in-application OAuth connect/reconnect flow.
- Request the minimum Gmail send scope.
- Validate OAuth state and callback ownership.
- Encrypt access token, refresh token, expiry, and related secrets before database persistence.
- Keep the encryption key only in server-side configuration.
- Display sender address, connection state, last success, last failure, and reconnect control without exposing tokens.

### 13.2 Email events

Generate email jobs for:

- First submission acknowledgement to the course leader
- Moderator action request
- Every return for revision
- Every resubmission acknowledgement and reviewer request
- Advancement to finalizer
- Team moderation assignments
- Advancement to dean/DD
- Examiner confirmation request
- DECA confirmation request
- Printing Section acknowledgement request
- Final closure acknowledgement
- Deadline reminders at 7, 3, and 1 day before the first-submission deadline
- One overdue notice
- Assignment-specific reopening notice

Emails contain subject/session metadata and an authenticated application link. Do not attach PDFs and do not place signed R2 URLs in messages.

### 13.3 Queue and retries

- Workflow mutations persist their state first and create deterministic email jobs.
- Use an idempotency key derived from event type, case, revision/transition, and recipient.
- Email delivery runs asynchronously.
- Retry transient failures at approximately 1 minute, 5 minutes, 30 minutes, and 2 hours.
- After the retry limit, mark the job permanently failed and display it to administrators.
- Administrators can retry failed jobs without creating a duplicate logical email.
- Email failure never rolls back a valid workflow transition.

## 14. Administrative Features

### 14.1 Academic management

Administrators can create, edit before use, deactivate, and restore academic years, sessions, and subjects. Entities referenced by submitted cases cannot be hard-deleted or materially changed.

### 14.2 User management

Administrators can:

- Search and paginate users
- Activate or disable users
- Grant or revoke administrator capability
- Correct display names
- Inspect assignment history

User records are never hard-deleted in normal operation.

### 14.3 Assignment import

Provide a downloadable `.xlsx` template containing columns for:

- Academic year
- Session
- Course code
- Course title
- Examination type
- Level
- Course leader email
- Moderator email
- Finalizer email
- Zero or more team moderator emails in the documented template representation
- Dean/DD email
- Examiner email
- First-submission deadline

Import processing is:

1. Parse the uploaded workbook without mutating production records.
2. Normalize values and institutional emails.
3. Validate every row and cross-row uniqueness.
4. Match users by normalized email.
5. Create proposed disabled placeholders for unknown valid institutional emails.
6. Classify each row as create, update, or conflict.
7. Display the complete preview and validation report.
8. Commit all rows and placeholders in a controlled all-or-nothing operation only after confirmation.

If any row is invalid, import nothing. Existing submitted assignments cannot be updated by import.

## 15. User Interface

### 15.1 Visual direction

- Light theme only
- MUJI-inspired restrained presentation
- Warm-white backgrounds, muted stone borders, charcoal text, and one limited accent color
- Generous spacing and simple hierarchy
- Minimal shadows, gradients, animation, and decoration
- Desktop-first layout that remains usable on tablets and phones

### 15.2 Route groups

Use separate file-based routes and a persistent sidebar:

- `/login`
- `/pending`
- `/dashboard`
- `/assignments`
- `/cases/$caseId`
- `/printing`
- `/admin/academic-years`
- `/admin/sessions`
- `/admin/subjects`
- `/admin/assignments`
- `/admin/imports`
- `/admin/users`
- `/admin/gmail`

Exact route filenames follow TanStack Router conventions. Do not combine the major administration modules into one tabs-only route.

### 15.3 Dashboard

The first release shows:

- Total cases visible to the user
- Counts by current stage
- Cases awaiting the current user's action
- Overdue first submissions
- Filters for academic year, session, stage/status, and course code/title

Do not implement advanced turnaround-time, return-rate, or email-performance analytics in the first release. Administrators may access a separate failed-email list from Gmail settings.

### 15.4 Case workspace

One route displays everything needed for a case:

1. Subject/session/examination header
2. Participants
3. Stage progress tracker
4. Required documents with preview and permitted file actions
5. Both structured cover forms
6. COBE URL
7. Chronological revisions, decisions, and overall comments
8. Current-stage action panel

Do not require users to navigate to separate pages to see comments. On desktop, keep review actions adjacent to the documents. On narrow screens, stack the same content in a logical reading order.

### 15.5 Interaction rules

- Use explicit save and submit/decision actions.
- Show destructive or locking consequences in confirmation dialogs.
- Disable impossible actions but retain server validation.
- Show field-level errors and a form-level summary for large forms.
- Preserve user input after recoverable network failures.
- Use loading states that distinguish initial load, background refresh, upload, validation, and submission.
- Use accessible labels, keyboard controls, visible focus, and WCAG 2.2 AA contrast.

## 16. Conceptual Data Model

The implementation plan must translate these entities into exact Convex validators and indexes.

| Entity | Purpose |
|---|---|
| `users` | Auth-linked profile, normalized email, admin/printing-staff capabilities, activation state |
| `faculties` | Faculty identity and configuration ownership |
| `academicYears` | Year labels and active state |
| `academicSessions` | Session codes, faculty/year, deadline defaults |
| `subjects` | Course code, title, faculty, active state |
| `assignments` | Session subject plus named workflow participants and deadline |
| `assignmentTeamMembers` | One row per team moderator |
| `moderationCases` | Current status, current revision, version, timestamps |
| `caseDrafts` | Mutable pre-submission or returned-state form/file references |
| `submissionRevisions` | Immutable submission snapshots |
| `revisionFiles` | Document kind, R2 key, hash, metadata, lifecycle state |
| `fileUploadTickets` | Short-lived case-bound quarantine upload authorization |
| `questionCoverSnapshots` | Immutable question-cover form values |
| `markingCoverSnapshots` | Immutable marking-cover form values |
| `stageDecisions` | Stage, actor, proceed/return, overall comment, revision |
| `teamReviewRounds` | One round per team resubmission |
| `teamMemberDecisions` | One member's decision within a round |
| `printingConfirmations` | Structured printing form and current section state |
| `deadlineReopenings` | New deadlines, reasons, administrators, timestamps |
| `gmailConnections` | Faculty sender and encrypted OAuth material |
| `gmailOAuthStates` | Single-use administrator/faculty callback state with expiry |
| `emailJobs` | Idempotent logical email and delivery state |
| `emailAttempts` | Individual send attempt history |
| `importJobs` | Workbook metadata, validation, preview, commit status |
| `importRows` | Bounded processing/report rows tied to an import job |
| `auditLogs` | Sensitive state changes and administrative actions |
| `fileAccessLogs` | Preview/download/print access events |
| `caseStageCounters` | Transactionally maintained dashboard counts |

Do not use `.collect().length` to derive dashboard counts. Maintain bounded or denormalized counters transactionally and provide a controlled reconciliation function.

## 17. Error Handling

Use stable machine-readable error codes and user-readable messages for:

- `UNAUTHENTICATED`
- `ACCOUNT_DISABLED`
- `FORBIDDEN`
- `CASE_NOT_FOUND`
- `INVALID_TRANSITION`
- `STALE_CASE_VERSION`
- `DEADLINE_CLOSED`
- `ASSIGNMENT_LOCKED`
- `VALIDATION_FAILED`
- `PDF_TOO_LARGE`
- `PDF_TYPE_INVALID`
- `PDF_CORRUPTED`
- `PDF_ENCRYPTED`
- `R2_UPLOAD_FAILED`
- `R2_OBJECT_MISSING`
- `GMAIL_DISCONNECTED`
- `EMAIL_DELIVERY_FAILED`
- `IMPORT_INVALID`
- `IMPORT_CONFLICT`

Expected validation or conflict errors must not expose stack traces. Unexpected server errors receive a correlation identifier and are logged without secrets or document content.

## 18. Audit and Retention

### 18.1 Audit coverage

Record at minimum:

- User creation/linking, activation, deactivation, and administrator changes
- Academic entity and assignment changes
- Import validation and commit
- Deadline reopening
- Upload validation, attachment, replacement, and deletion
- Every submission and resubmission
- Every stage decision
- Every printing-form confirmation
- Gmail connection changes
- Email retry/manual retry state changes
- Purge eligibility and purge execution

Each audit record includes actor, action, target type/id, case where applicable, previous state summary, resulting state summary, timestamp, and reason when required.

### 18.2 File-access logging

Record user, case, revision, file, action (`preview`, `download`, or `print`), and timestamp whenever a signed URL or print payload is issued.

### 18.3 Retention

- Retain closed case records and permanent files for seven years from case closure.
- Before seven years, neither normal administrators nor automated cleanup can purge permanent records.
- After seven years, mark the case purge-eligible.
- The first release exposes controlled administrator review and purge; it does not automatically purge on the eligibility date.
- Purge must verify references, delete R2 objects, then remove or tombstone Convex records according to audit requirements.

## 19. Verification Strategy

Testing prioritizes workflow, authorization, data integrity, and institutional print fidelity. Do not spend tests on shadcn internals, static labels, decorative styling, or trivial property accessors.

### 19.1 Backend tests

Use `convex-test` and Vitest to cover:

- Every permitted and forbidden state transition
- Every return/resubmission route
- Team zero-member skip, all-member approval, immediate return, and new-round reset
- First-submission deadline and selected-assignment reopening
- Immutable revision creation and finalization lock
- Authorization matrix, including administrator non-impersonation
- Disabled, bootstrap, unknown, and placeholder-user sign-in behavior
- Import all-or-nothing behavior and placeholder creation
- Email job idempotency, retries, and permanent failure
- Dashboard counter updates and reconciliation
- Seven-year purge eligibility

### 19.2 File tests

Test adapters and validation with deterministic fixtures for:

- Valid PDF
- Each file just below and above 10 MB
- Renamed non-PDF content
- Truncated/corrupt PDF
- Password-protected/encrypted PDF
- Missing R2 object
- Unauthorized signed-URL request
- Quarantine cleanup and permanent-object preservation

### 19.3 Browser tests

Maintain a small critical suite:

1. Course leader first submission through complete forward approval
2. Return, selective replacement, and direct resubmission
3. Multi-member team moderation
4. Examiner, DECA, and Printing Section confirmation
5. Unrelated-user denial of case and file access

### 19.4 Visual and accessibility tests

- Use one A4 visual-regression test for the confirmation-for-printing form against the supplied reference.
- Verify continuation form output for a fourth submission.
- Run automated accessibility checks on login, dashboard, case workspace, import preview, and printing confirmation.
- Manually verify keyboard operation and screen-reader labels on the critical path.

### 19.5 Stage gates

Every implementation stage must pass:

- Focused tests for changed business behavior
- TypeScript strict check
- Production build

The complete critical browser suite runs at integration milestones and before completion rather than after every small component.

## 20. Operational Configuration

Document, without committing values, the required configuration categories:

- Convex deployment URL
- Convex Auth JWT keys and site URL
- Google authentication client ID and secret
- Bootstrap administrator email
- Allowed domain `tarc.edu.my`
- R2 account ID, bucket, endpoint, access key, secret key, and signing settings
- Gmail OAuth client ID, secret, callback URL, and token-encryption key
- Application base URL

Use separate development and production credentials. Never reuse production OAuth tokens or R2 credentials in automated tests.

## 21. Deterministic Acceptance Checklist

Implementation is complete only when all statements are true:

- A non-`@tarc.edu.my` Google account cannot enter the application.
- A new institutional account is disabled by default.
- An imported placeholder links by normalized email on first sign-in.
- An administrator cannot act for an assigned reviewer without being independently assigned.
- The full workflow and every return route match Section 8.
- Multiple team members must all approve each team round.
- Comments are visible together on the case route.
- Each required PDF independently enforces 10 MB and rejects invalid, corrupt, or encrypted content.
- Unrelated users cannot obtain case metadata or R2 signed URLs.
- Cover forms contain the fields in Section 11.
- The printing form matches the supplied A4 reference and supports continuation forms after Revision 2.
- Submission and decision records are immutable and timestamped.
- First-submission deadlines and selected-assignment reopening work in Kuala Lumpur time.
- Excel import validates fully before an all-or-nothing commit.
- Gmail failures retry without reverting workflow transitions or duplicating emails.
- Dashboard counts do not depend on unbounded reads.
- Retention prevents purge before seven years.
- TypeScript, production build, focused backend tests, critical browser tests, and printing visual regression pass.

## 22. Authoritative Inputs and Precedence

The approved specification and implementation plan are the complete textual authorities for the project. The only external workspace references are the three retained PNG form templates in `forms/`, which are authoritative for institutional form content and print geometry.

If implementation details conflict, apply this precedence:

1. Explicit requirements in this specification
2. Exact interfaces and steps in the approved implementation plan
3. Current official documentation for the pinned dependency version

Do not recover requirements from deleted planning or guide files.
