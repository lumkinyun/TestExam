# Exam Moderation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure FOET examination moderation SPA covering assignment, submission, staged review, printing confirmation, Gmail notification, and seven-year retention.

**Architecture:** Use a React SPA in `app/`, Convex as the authoritative database/workflow layer, Cloudflare R2 for private PDFs, and Google OAuth for both sign-in and faculty Gmail sending. Store case history as immutable child records and route every status change through one tested transition service.

**Tech Stack:** Bun, React, TypeScript strict mode, Vite, Tailwind CSS, shadcn/ui, TanStack Router, TanStack Table, React Hook Form, Zod, Zustand, Convex, Convex Auth, Cloudflare R2 S3 API, PDF.js, ExcelJS, Vitest, `convex-test`, Playwright.

## Global Constraints

- Work inside `app/`; retain `docs/` and the three authoritative PNG files in `forms/` at the workspace root.
- Use Bun only. Never generate npm, pnpm, or Yarn lockfiles.
- This workspace is intentionally non-Git. Do not initialize Git and do not add commit steps.
- Do not run a long-lived development server during implementation; the user starts development servers manually. Playwright may start and stop the production preview server automatically.
- Resolve mutually compatible stable packages during Task 1, then treat `app/bun.lock` and exact `app/package.json` versions as authoritative.
- Use React 19, TypeScript strict mode, Vite, Tailwind CSS v4, shadcn/ui, TanStack Router file-based routing, TanStack Table v8, React Hook Form, Zod v4, Zustand, and Lucide.
- Use feature folders. Do not create global `services/`, `contexts/`, or general-purpose `hooks/` directories.
- Keep focused source files at or below approximately 300 lines; split by responsibility when they grow beyond that boundary.
- Use shadcn/ui primitives and document any edits inside generated UI files with an `OVERRIDE: YYYY-MM-DD` comment.
- Use `<Link>` for all internal navigation.
- Use React Hook Form `Controller`; trim all strings in Zod and again before persistence.
- Never trust frontend authorization, filenames, MIME types, sizes, status, or actor identifiers.
- Every Convex function has argument and return validators. Protected functions begin with shared authorization.
- Use `getAuthUserId(ctx)` from `@convex-dev/auth/server`; do not use the identity subject as the application user ID.
- Use indexes rather than Convex `.filter()`. Bound or paginate collections. Never use `.collect().length` for dashboard counts.
- Node actions live in files beginning with `"use node";` and those files export no query or mutation.
- Actions access the database only through `ctx.runQuery` and `ctx.runMutation`.
- Use `ctx.scheduler.runAfter`/`runAt` for durable email work and `crons.interval`/`crons.cron` for recurring cleanup/reconciliation.
- Use Cloudflare R2 presigned `PUT` for upload and presigned `GET` for preview. Configure R2 CORS for the application origins.
- Keep R2, Google, Convex, and encryption secrets server-side. Never log tokens or signed URLs.
- Use one overall review-comment textarea; require it for returns and show all comments in one case timeline.
- The confirmation-for-printing output must match `forms/confirmation printing form.png` at A4 dimensions and support continuation forms after Revision 2.
- Retain closed records for seven years; do not automatically purge immediately on eligibility.
- Prioritize business/security tests. Do not test framework internals or static decorative output.
- After every task, run the task's focused tests and `rtk bunx tsc --noEmit`. Run the production build at each milestone stated below.

## Authoritative References

- Product design: `docs/superpowers/specs/2026-07-05-exam-moderation-system-design.md`
- Form content/geometry: `forms/question paper cover page.png`, `forms/marking scheme cover page.png`, `forms/confirmation printing form.png`
- Convex Auth: <https://labs.convex.dev/auth>
- Convex actions: <https://docs.convex.dev/functions/actions>
- Convex scheduling: <https://docs.convex.dev/scheduling/scheduled-functions>
- Cloudflare R2 presigned URLs: <https://developers.cloudflare.com/r2/api/s3/presigned-urls/>
- Cloudflare R2 CORS: <https://developers.cloudflare.com/r2/buckets/cors/>
- Google OAuth web-server flow: <https://developers.google.com/identity/protocols/oauth2/web-server>
- Gmail send method: <https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send>
- PDF.js: <https://mozilla.github.io/pdf.js/getting_started/>

## Locked File Structure

```text
app/
  .env.example
  components.json
  package.json
  bun.lock
  playwright.config.ts
  vite.config.ts
  vitest.config.ts
  tsconfig*.json
  convex/
    auth.config.ts
    auth.ts
    http.ts
    schema.ts
    crons.ts
    lib/
      authorization.ts
      errors.ts
      validators.ts
      audit.ts
    users.ts
    academicYears.ts
    sessions.ts
    subjects.ts
    assignments.ts
    imports.ts
    importActions.ts
    files.ts
    r2Actions.ts
    revisions.ts
    cases.ts
    workflow.ts
    teamReviews.ts
    printing.ts
    gmail.ts
    gmailActions.ts
    emailJobs.ts
    emailActions.ts
    dashboard.ts
    retention.ts
    __tests__/
  src/
    main.tsx
    router.tsx
    routeTree.gen.ts
    styles.css
    lib/
      constants.ts
      schemas.ts
      errors.ts
      utils.ts
    components/
      ui/
      shared/
    features/
      auth/
      shell/
      dashboard/
      academics/
      users/
      assignments/
      imports/
      files/
      submissions/
      moderation/
      printing/
      gmail/
    routes/
      __root.tsx
      login.tsx
      pending.tsx
      dashboard.tsx
      assignments.tsx
      cases.$caseId.tsx
      printing.tsx
      admin.academic-years.tsx
      admin.sessions.tsx
      admin.subjects.tsx
      admin.assignments.tsx
      admin.imports.tsx
      admin.users.tsx
      admin.gmail.tsx
  e2e/
  tests/fixtures/
```

Generated `app/src/routeTree.gen.ts` is never edited manually.

---

### Task 1: Scaffold the Application and Quality Gates

**Files:**
- Create: `app/package.json`, `app/bun.lock`, `app/vite.config.ts`, `app/vitest.config.ts`, `app/playwright.config.ts`
- Create: `app/tsconfig.json`, `app/tsconfig.app.json`, `app/tsconfig.node.json`
- Create: `app/components.json`, `app/.env.example`
- Create: `app/src/main.tsx`, `app/src/router.tsx`, `app/src/routes/__root.tsx`, `app/src/styles.css`
- Test: `app/src/lib/smoke.test.ts`

**Interfaces:**
- Produces: Vite app, strict TypeScript, generated TanStack route tree, Convex client provider, Vitest and Playwright commands.
- Produces scripts: `dev`, `build`, `preview`, `typecheck`, `test`, `test:watch`, `test:e2e`, `lint`.

- [ ] **Step 1: Scaffold without overwriting workspace documentation**

Run from the workspace root:

```bash
rtk bunx create-vite@latest app --template react-ts
```

Expected: `app/` contains a working React TypeScript Vite project and `bun.lock`; no other lockfile exists.

Set the execution tool's working directory to `app/` for every subsequent command; do not use an unprefixed shell `cd` command.

```bash
rtk bun install
```

- [ ] **Step 2: Install runtime and test dependencies**

```bash
rtk bun add convex @convex-dev/auth @tanstack/react-router @tanstack/router-plugin @tanstack/react-table zustand zod react-hook-form @hookform/resolvers lucide-react clsx tailwind-merge class-variance-authority tailwindcss @tailwindcss/vite react-pdf pdfjs-dist @aws-sdk/client-s3 @aws-sdk/s3-request-presigner exceljs googleapis
rtk bun add -d typescript vite @vitejs/plugin-react vitest convex-test @edge-runtime/vm @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @playwright/test @axe-core/playwright
rtk bunx shadcn@latest init -d
rtk bunx shadcn@latest add button card input label textarea select dialog alert-dialog sheet sidebar table badge separator dropdown-menu command popover tooltip progress skeleton sonner
```

Expected: exact resolved versions appear in `package.json` and `bun.lock`.

- [ ] **Step 3: Write the failing smoke test**

```ts
// app/src/lib/smoke.test.ts
import { describe, expect, it } from "vitest";
import { APP_NAME } from "./constants";

describe("application contract", () => {
  it("uses the approved product name", () => {
    expect(APP_NAME).toBe("Exam Moderation System");
  });
});
```

Run: `rtk bun test src/lib/smoke.test.ts`  
Expected: FAIL because `src/lib/constants.ts` does not exist.

- [ ] **Step 4: Add the minimum app contract and provider shell**

```ts
// app/src/lib/constants.ts
export const APP_NAME = "Exam Moderation System" as const;
export const ALLOWED_EMAIL_DOMAIN = "tarc.edu.my" as const;
export const APP_TIME_ZONE = "Asia/Kuala_Lumpur" as const;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
```

Configure the TanStack Router Vite plugin before React, Tailwind's Vite plugin, strict TypeScript, jsdom Vitest defaults, and Playwright web-server command `rtk bun run preview -- --host 127.0.0.1` after `rtk bun run build`.

- [ ] **Step 5: Add scripts and environment documentation**

`.env.example` lists names only: `VITE_CONVEX_URL`, `SITE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, R2 settings, Gmail OAuth settings, and `TOKEN_ENCRYPTION_KEY`.

Run:

```bash
rtk bun test src/lib/smoke.test.ts
rtk bunx tsc --noEmit
rtk bun run build
```

Expected: one passing smoke test, zero TypeScript errors, successful Vite build.

---

### Task 2: Define Domain Contracts and Convex Schema

**Files:**
- Create: `app/src/lib/schemas.ts`, `app/convex/lib/validators.ts`, `app/convex/lib/errors.ts`
- Create: `app/convex/schema.ts`, `app/convex/auth.config.ts`, `app/convex/auth.ts`, `app/convex/http.ts`
- Test: `app/convex/__tests__/schema.test.ts`

**Interfaces:**
- Produces: `CaseStatus`, `CaseActorRole`, `DocumentKind`, `Decision`, Zod equivalents, Convex validators, and all tables/indexes.
- Status union: `draft | awaiting_moderator | returned_by_moderator | awaiting_finalizer | returned_by_finalizer | awaiting_team | returned_by_team | awaiting_dean | returned_by_dean | awaiting_examiner_confirmation | awaiting_deca_confirmation | awaiting_printing_acknowledgement | closed`.

- [ ] **Step 1: Write schema-contract tests**

```ts
// app/convex/__tests__/schema.test.ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

describe("schema", () => {
  it("initializes with auth and domain tables", async () => {
    const t = convexTest(schema, modules);
    expect(t).toBeDefined();
  });
});
```

Run: `rtk bun test convex/__tests__/schema.test.ts`  
Expected: FAIL because the schema is absent.

- [ ] **Step 2: Create shared literal contracts**

```ts
export const CASE_STATUSES = [
  "draft", "awaiting_moderator", "returned_by_moderator",
  "awaiting_finalizer", "returned_by_finalizer", "awaiting_team",
  "returned_by_team", "awaiting_dean", "returned_by_dean",
  "awaiting_examiner_confirmation", "awaiting_deca_confirmation",
  "awaiting_printing_acknowledgement", "closed",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const DOCUMENT_KINDS = ["question_paper", "marking_scheme"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export const DECISIONS = ["proceed", "return"] as const;
export type Decision = (typeof DECISIONS)[number];
export const CASE_ACTOR_ROLES = [
  "course_leader", "moderator", "finalizer", "team_moderator",
  "dean", "examiner", "printing_staff",
] as const;
export type CaseActorRole = (typeof CASE_ACTOR_ROLES)[number];
```

Mirror these literals in Convex validators; never maintain a different spelling in frontend code.

- [ ] **Step 3: Define the complete schema**

Create every entity listed in design Section 16. Required compound indexes include normalized email; faculty/year/session; course code; assignment uniqueness; case status/assignment; revisions by case/number; files by case/state; decisions by case/creation; team decisions by round/member; email idempotency/status/schedule; audit by target and case; access logs by case; and counters by faculty/year/session/status.

Use `authTables` and override the Auth `users` table only with all required auth fields preserved plus application fields: `normalizedEmail`, `isAdmin`, `isPrintingStaff`, `isActive`, `facultyId`, and `linkedAt`. Include `caseDrafts`, `fileUploadTickets`, and `gmailOAuthStates` in addition to every entity listed in design Section 16.

- [ ] **Step 4: Configure Convex Auth**

`auth.config.ts` uses `process.env.CONVEX_SITE_URL` with application ID `convex`. `auth.ts` configures Google only. `http.ts` registers Auth routes and reserves explicit Gmail OAuth callback routing for Task 13.

Run:

```bash
rtk bun test convex/__tests__/schema.test.ts
rtk bunx convex codegen
rtk bunx tsc --noEmit
```

Expected: schema test passes and generated Convex types compile.

---

### Task 3: Implement Authentication, Provisioning, and Authorization

**Files:**
- Create: `app/convex/users.ts`, `app/convex/lib/authorization.ts`, `app/convex/lib/audit.ts`
- Create: `app/src/features/auth/hooks/useCurrentUser.ts`, `app/src/features/auth/store/useAuthStore.ts`
- Create: `app/src/features/auth/components/LoginCard.tsx`, `PendingCard.tsx`, `AuthGuard.tsx`
- Create: `app/src/routes/login.tsx`, `app/src/routes/pending.tsx`
- Test: `app/convex/__tests__/authorization.test.ts`, `app/src/features/auth/components/AuthGuard.test.tsx`

**Interfaces:**
- Produces: `requireActiveUser(ctx): Promise<Doc<"users">>`
- Produces: `requireAdmin(ctx): Promise<Doc<"users">>`
- Produces: `requireCaseAccess(ctx, caseId): Promise<{ user; caseDoc; assignment }>`
- Produces: `requireCaseActor(ctx, caseId, role): Promise<...>`
- Produces public query `users.current` and admin user-management mutations.

- [ ] **Step 1: Write authorization failures first**

Cover unauthenticated, disabled, unrelated, administrator read access, administrator non-impersonation, assigned actor access, and placeholder linkage by normalized email.

```ts
await expect(
  t.withIdentity({ subject: "outsider", email: "outside@example.com" })
    .query(api.users.current, {}),
).rejects.toThrow("UNAUTHENTICATED");
```

Run: `rtk bun test convex/__tests__/authorization.test.ts`  
Expected: FAIL because authorization helpers do not exist.

- [ ] **Step 2: Implement identity lookup and domain enforcement**

Normalize email with `email.trim().toLowerCase()`. Accept only the exact domain suffix `@tarc.edu.my`. Link an existing placeholder before creating a new disabled user. Compare bootstrap email only after normalization.

- [ ] **Step 3: Implement the authorization helpers**

```ts
export async function requireCaseActor(
  ctx: QueryCtx | MutationCtx,
  caseId: Id<"moderationCases">,
  role: CaseActorRole,
): Promise<{ user: Doc<"users">; caseDoc: Doc<"moderationCases">; assignment: Doc<"assignments"> }>;
```

The function derives the caller from Auth and the role from assignment records. It never accepts a caller user ID.

- [ ] **Step 4: Implement login and pending UI**

Use `<AuthLoading>`, `<Unauthenticated>`, and `<Authenticated>` in the root route. Keep `useCurrentUser()` inside the authenticated tree. Redirect disabled users to `/pending` and active users away from `/login`.

- [ ] **Step 5: Verify**

Run:

```bash
rtk bun test convex/__tests__/authorization.test.ts src/features/auth/components/AuthGuard.test.tsx
rtk bunx tsc --noEmit
rtk bun run build
```

Expected: authorization matrix passes; app builds.

---

### Task 4: Build the Application Shell and Route Boundaries

**Files:**
- Create: `app/src/features/shell/components/AppSidebar.tsx`, `AppLayout.tsx`, `PageHeader.tsx`
- Create: `app/src/components/shared/LoadingScreen.tsx`, `EmptyState.tsx`, `ErrorState.tsx`
- Create: all route stub files listed in Locked File Structure
- Test: `app/src/features/shell/components/AppSidebar.test.tsx`

**Interfaces:**
- Consumes: `users.current`, `AuthGuard`.
- Produces: role-filtered navigation and one authenticated route layout.

- [ ] **Step 1: Test route visibility**

Assert disabled users see no app navigation, normal active users see dashboard/assignments/printing as applicable, and administrators see the administration group. Assert internal items render TanStack `<Link>`.

- [ ] **Step 2: Implement the MUJI-inspired theme tokens**

Define warm-white background, stone borders, charcoal text, one muted accent, accessible focus ring, and light mode only in `styles.css`. Do not add dark-mode selectors.

- [ ] **Step 3: Implement shell and route stubs**

Each route stub renders a named page component imported from its feature folder. Keep route files thin. Generate `routeTree.gen.ts` through the router plugin.

- [ ] **Step 4: Verify**

Run: `rtk bun test src/features/shell/components/AppSidebar.test.tsx && rtk bunx tsc --noEmit`  
Expected: route visibility and internal navigation tests pass.

---

### Task 5: Implement Academic-Year, Session, and Subject Administration

**Files:**
- Create: `app/convex/academicYears.ts`, `app/convex/sessions.ts`, `app/convex/subjects.ts`
- Create: `app/src/features/academics/components/AcademicYearsPage.tsx`, `SessionsPage.tsx`, `SubjectsPage.tsx`
- Create: `app/src/features/academics/components/AcademicYearDialog.tsx`, `SessionDialog.tsx`, `SubjectDialog.tsx`
- Test: `app/convex/__tests__/academics.test.ts`, `app/src/features/academics/components/SubjectDialog.test.tsx`

**Interfaces:**
- Produces paginated list queries and admin-only create/update/deactivate/restore mutations.
- Year input: `YYYY/YYYY`; session code: six digits ending `01|05|09`; subject code: `[A-Z]{4}[0-9]{4}`.

- [ ] **Step 1: Write validation and authorization tests**

Test valid/invalid year pairs, session suffixes, uppercase subject normalization, duplicate rejection, admin-only writes, active-row listing, and inability to materially alter an entity referenced by a submitted case.

- [ ] **Step 2: Implement backend functions with named indexes**

All list queries accept pagination plus search/filter inputs. Deactivation uses `isActive: false`; inactive rows remain queryable for administrators.

- [ ] **Step 3: Implement Controller-based forms and paginated tables**

Use separate routes, not tabs. Reset page index when search or filters change. Show inactive rows dimmed with restore actions.

- [ ] **Step 4: Verify**

Run: `rtk bun test convex/__tests__/academics.test.ts src/features/academics/components/SubjectDialog.test.tsx && rtk bunx tsc --noEmit`  
Expected: validation, authorization, and form tests pass.

---

### Task 6: Implement Users and Subject Assignments

**Files:**
- Modify: `app/convex/users.ts`
- Create: `app/convex/assignments.ts`
- Create: `app/src/features/users/components/UsersPage.tsx`, `UserAccessDialog.tsx`
- Create: `app/src/features/assignments/components/AssignmentsPage.tsx`, `AssignmentDialog.tsx`, `ParticipantSummary.tsx`
- Test: `app/convex/__tests__/assignments.test.ts`, `app/src/features/assignments/components/AssignmentDialog.test.tsx`

**Interfaces:**
- Produces `assignments.create`, `updateBeforeSubmission`, `deactivate`, `restore`, `listPaginated`, `getById`.
- Produces `users.setAccess({ userId, isActive, isAdmin, isPrintingStaff })`; printing staff is a faculty-scoped user capability rather than a per-subject assignment.
- Team members are separate `assignmentTeamMembers` rows.
- Assignment writes accept emails; backend resolves normalized institutional users or creates disabled placeholders through one internal helper.

- [ ] **Step 1: Write assignment invariants**

Test exactly one course leader/moderator/finalizer/dean/examiner, zero-or-more unique team members, valid deadline, no duplicate assignment identity, placeholder creation, overlap across different roles/cases, printing-staff access within the same faculty, and lock after first submission.

- [ ] **Step 2: Implement placeholder resolution**

```ts
export async function getOrCreatePlaceholder(
  ctx: MutationCtx,
  normalizedEmail: string,
  facultyId: Id<"faculties">,
): Promise<Id<"users">>;
```

Reject non-institutional emails before lookup. New placeholders have `isActive: false` and no auth link.

- [ ] **Step 3: Implement assignment mutation transaction**

Write the assignment and team rows atomically. On update, diff team rows rather than retaining stale assignments. Reject changes when the linked case has a submitted revision.

- [ ] **Step 4: Implement admin UI**

Use searchable email comboboxes and display disabled placeholders clearly. Participant summary always lists all assigned people. The user-access dialog controls active, administrator, and printing-staff capabilities independently.

- [ ] **Step 5: Verify**

Run: `rtk bun test convex/__tests__/assignments.test.ts src/features/assignments/components/AssignmentDialog.test.tsx && rtk bunx tsc --noEmit`  
Expected: assignment invariants pass.

---

### Task 7: Implement Excel Template, Validation, Preview, and Atomic Import

**Files:**
- Create: `app/convex/imports.ts`, `app/convex/importActions.ts`
- Create: `app/src/features/imports/components/ImportsPage.tsx`, `ImportDropzone.tsx`, `ImportPreviewTable.tsx`
- Create: `app/src/features/imports/lib/templateColumns.ts`
- Test: `app/convex/__tests__/imports.test.ts`, `app/src/features/imports/components/ImportPreviewTable.test.tsx`
- Fixture: `app/tests/fixtures/assignments-valid.xlsx`, `assignments-invalid.xlsx`

**Interfaces:**
- Produces `imports.generateTemplate`, `importActions.parseWorkbook({ workbook: ArrayBuffer })`, `imports.preview`, `imports.commit`.
- Rejects workbooks larger than 750 KiB or containing more than 300 data rows.

```ts
export type NormalizedAssignmentRow = {
  academicYear: string;
  sessionCode: string;
  courseCode: string;
  courseTitle: string;
  examinationType: "main" | "resit" | "repeat";
  level: "bachelor" | "diploma";
  courseLeaderEmail: string;
  moderatorEmail: string;
  finalizerEmail: string;
  teamModeratorEmails: string[];
  deanEmail: string;
  examinerEmail: string;
  firstSubmissionDeadline: number;
};

export type ImportRowResult = {
  rowNumber: number;
  kind: "create" | "update" | "conflict";
  errors: string[];
  normalized: NormalizedAssignmentRow | null;
};
```

- [ ] **Step 1: Test all-or-nothing semantics**

Create fixtures containing a valid workbook, bad course code, duplicate assignment, non-institutional email, invalid deadline, unknown institutional users, and an attempted update to a submitted case. Assert one invalid row prevents every write.

- [ ] **Step 2: Generate the exact workbook template**

Use ExcelJS. Include documented column headers, example row, ISO-like Kuala Lumpur deadline format, comma-separated team emails, validations/help text, and a hidden template-version cell.

- [ ] **Step 3: Parse in a Node action and persist bounded results**

`importActions.ts` begins with `"use node";`. The browser reads the validated workbook with `File.arrayBuffer()` and passes the bytes to the action. The action enforces the 750 KiB and 300-row limits, parses bytes, normalizes every row, then calls one internal mutation to store the report. Do not mutate assignments during parsing and do not retain the workbook bytes after parsing.

- [ ] **Step 4: Commit atomically after confirmation**

Revalidate import status and referenced records at commit time. Create placeholders and assignment rows in the controlled commit. If the workbook exceeds a safe single-transaction row limit, reject it with an explicit maximum-row error rather than partially importing.

- [ ] **Step 5: Implement preview UI and verify**

Run: `rtk bun test convex/__tests__/imports.test.ts src/features/imports/components/ImportPreviewTable.test.tsx && rtk bunx tsc --noEmit`  
Expected: fixture classifications and atomicity tests pass.

---

### Task 8: Implement Cloudflare R2 Upload, PDF Validation, Preview, and Cleanup

**Files:**
- Create: `app/convex/files.ts`, `app/convex/r2Actions.ts`
- Create: `app/src/features/files/components/PdfUploadCard.tsx`, `PdfPreviewDialog.tsx`
- Create: `app/src/features/files/lib/uploadPdf.ts`
- Modify: `app/convex/crons.ts`
- Test: `app/convex/__tests__/files.test.ts`, `app/src/features/files/components/PdfUploadCard.test.tsx`
- Fixtures: valid, corrupt, encrypted, renamed, under-limit, and over-limit PDFs in `app/tests/fixtures/pdfs/`

**Interfaces:**
- Produces `files.requestUpload({ caseId, kind, fileName, contentType, size })`.
- Produces `r2Actions.finalizeUpload({ uploadTicketId })`.
- Produces `r2Actions.getPreviewUrl({ fileId })` returning `{ url; expiresAt }` after authorization.
- Produces `files.detachDraftFile({ caseId, fileId })`.

- [ ] **Step 1: Write file-security tests**

Test authorization before ticket creation, independent 10 MB limits, non-PDF signatures, corrupt/encrypted PDFs, ticket/object mismatch, immutable permanent objects, unrelated-user preview denial, and access-log creation.

- [ ] **Step 2: Implement ticket issuance and presigning**

Use an opaque key containing generated identifiers rather than user filenames. Generate a presigned R2 `PUT` valid for five minutes. Bind expected content type and store ticket expiry. Configure documentation for R2 CORS origins and methods `PUT`, `GET`, `HEAD`.

- [ ] **Step 3: Implement authoritative server validation**

`r2Actions.ts` is Node-only. Issue `HEAD`, enforce actual size, read bytes, verify `%PDF-`, parse with the locked PDF library, reject encryption/password protection, compute SHA-256, and call an internal mutation that marks the object validated only when the ticket and object match.

- [ ] **Step 4: Implement upload UI**

```ts
export async function uploadPdf(args: {
  file: File;
  requestTicket: () => Promise<{ uploadTicketId: string; putUrl: string }>;
  finalize: (uploadTicketId: string) => Promise<{ fileId: string }>;
}): Promise<{ fileId: string }>;
```

The browser uses `PUT`, reports upload/validation states separately, and retains actionable validation messages.

- [ ] **Step 5: Add cleanup and preview**

Schedule quarantine/orphan cleanup with bounded batches and self-rescheduling mutations. Preview uses a short-lived presigned `GET`, records access, and renders through PDF.js with local worker configuration.

- [ ] **Step 6: Verify**

Run: `rtk bun test convex/__tests__/files.test.ts src/features/files/components/PdfUploadCard.test.tsx && rtk bunx tsc --noEmit`  
Expected: all file fixtures and authorization cases pass.

---

### Task 9: Build Draft Submission and Structured Cover Forms

**Files:**
- Create: `app/src/features/submissions/schemas/coverForms.ts`
- Create: `app/src/features/submissions/components/QuestionCoverForm.tsx`, `MarkingCoverForm.tsx`, `SubmissionDocuments.tsx`, `SubmissionWorkspace.tsx`
- Create: `app/convex/revisions.ts`
- Test: `app/src/features/submissions/components/QuestionCoverForm.test.tsx`, `MarkingCoverForm.test.tsx`, `app/convex/__tests__/drafts.test.ts`

**Interfaces:**
- Produces `revisions.getDraft`, `saveDraft`, `validateDraftReadiness`.
- `QuestionCoverValues` and `MarkingCoverValues` contain every field in design Section 11.
- Attachment rows are fixed to a maximum of eight; examiner names are fixed to a maximum of four.

- [ ] **Step 1: Write form-schema tests from the retained templates**

Test required fields, derived fields, examination type/level enums, numeric non-negative counts, attachment total equality, maximum row counts, and whitespace trimming.

- [ ] **Step 2: Implement exact Zod schemas and TypeScript types**

Keep numeric inputs as strings in form state; convert explicitly on submission so empty optional fields never become zero.

- [ ] **Step 3: Implement structured forms**

Use Controller for every field. Prepopulate authoritative assignment values read-only. Derive submission date at actual submission, not draft save. Use authenticated name/timestamp rather than drawn signatures.

- [ ] **Step 4: Implement draft save transaction**

Draft save verifies course-leader role and editable status. Store current draft form values and validated file references. Reject permanent or foreign file IDs. Saving a draft sends no email and creates no immutable revision.

- [ ] **Step 5: Assemble one workspace**

Place documents, both forms, COBE HTTPS URL, readiness summary, and save/submit controls on one route. Add unsaved-change protection.

- [ ] **Step 6: Verify**

Run: `rtk bun test convex/__tests__/drafts.test.ts src/features/submissions/components/QuestionCoverForm.test.tsx src/features/submissions/components/MarkingCoverForm.test.tsx && rtk bunx tsc --noEmit`  
Expected: form and draft tests pass.

---

### Task 10: Implement Immutable Revisions and the Core Workflow Service

**Files:**
- Create: `app/convex/workflow.ts`, `app/convex/cases.ts`
- Modify: `app/convex/revisions.ts`, `app/convex/lib/audit.ts`
- Test: `app/convex/__tests__/workflow.test.ts`, `app/convex/__tests__/revisions.test.ts`

**Interfaces:**
- Produces pure `resolveTransition(input: TransitionInput): CaseStatus`.
- Produces `cases.submitRevision({ caseId, expectedVersion })`.
- Produces `cases.decide({ caseId, expectedVersion, decision, comment })`.
- Produces immutable stage decisions, revision snapshots, audits, and counter changes in the transition transaction.

```ts
export type TransitionInput = {
  from: CaseStatus;
  role: CaseActorRole;
  decision: Decision;
  hasTeam: boolean;
};
```

- [ ] **Step 1: Encode the complete transition table as failing parameterized tests**

Include every forward transition, every return, every direct resubmission, finalizer team skip, invalid actor, stale version, duplicate decision, finalization lock, and comment-required-on-return behavior.

```ts
it.each([
  ["awaiting_moderator", "moderator", "proceed", "awaiting_finalizer"],
  ["awaiting_moderator", "moderator", "return", "returned_by_moderator"],
  ["awaiting_dean", "dean", "proceed", "awaiting_examiner_confirmation"],
] as const)("transitions %s", (from, role, decision, expected) => {
  expect(resolveTransition({ from, role, decision, hasTeam: false })).toBe(expected);
});
```

- [ ] **Step 2: Implement pure transition resolution**

Use exhaustive switches with a `never` guard. Do not let UI or mutations construct target status directly.

- [ ] **Step 3: Implement first submission and resubmission**

Validate deadline only when current state is `draft`. Snapshot files/forms/COBE, mark referenced R2 objects permanent, increment revision number and case version, clear the editable draft, and target the appropriate waiting state.

- [ ] **Step 4: Implement decision transaction**

Verify actor, status, revision, and expected version. Insert immutable decision and audit. Update current status and counters. Schedule email-job creation after the state write in the same mutation.

- [ ] **Step 5: Verify**

Run: `rtk bun test convex/__tests__/workflow.test.ts convex/__tests__/revisions.test.ts && rtk bunx tsc --noEmit`  
Expected: complete transition matrix and immutable revision tests pass.

---

### Task 11: Implement Moderation, Team Rounds, and the Unified Timeline UI

**Files:**
- Create: `app/convex/teamReviews.ts`
- Create: `app/src/features/moderation/components/CaseWorkspace.tsx`, `ProgressTracker.tsx`, `ParticipantList.tsx`, `DecisionPanel.tsx`, `CaseTimeline.tsx`
- Modify: `app/src/routes/cases.$caseId.tsx`
- Test: `app/convex/__tests__/teamReviews.test.ts`, `app/src/features/moderation/components/DecisionPanel.test.tsx`, `CaseTimeline.test.tsx`

**Interfaces:**
- Produces `teamReviews.decide` and team-round queries.
- Produces `cases.getWorkspace` returning one authorization-filtered workspace payload.
- Timeline merges revisions, decisions, comments, reopenings, and printing events in chronological order.

- [ ] **Step 1: Write team-round tests**

Cover zero-member skip, one-member proceed, all-member requirement, immediate return, duplicate member decision, stale revision, and new round requiring every member after resubmission.

- [ ] **Step 2: Implement bounded team rows and decision mutation**

Do not store member decisions in arrays. Query by `roundId + memberId`. Close a round on return; advance only after transactionally maintained remaining-approval count reaches zero.

- [ ] **Step 3: Write decision-panel behavior tests**

Assert one overall textarea, return validation, optional proceed comment, role/status-specific buttons, finalization warning, and conflict refresh message.

- [ ] **Step 4: Implement the unified case workspace**

Render header, participants, progress, document viewer, forms, COBE link, complete timeline, and current-stage actions on one route. Never send users to a separate comments page.

- [ ] **Step 5: Verify milestone**

Run:

```bash
rtk bun test convex/__tests__/teamReviews.test.ts src/features/moderation/components/DecisionPanel.test.tsx src/features/moderation/components/CaseTimeline.test.tsx
rtk bunx tsc --noEmit
rtk bun run build
```

Expected: team and workspace tests pass; production build succeeds.

---

### Task 12: Implement Pixel-Matched Printing Confirmation

**Files:**
- Create: `app/convex/printing.ts`
- Create: `app/src/features/printing/components/PrintingQueuePage.tsx`, `PrintingConfirmationForm.tsx`, `PrintingFormDocument.tsx`
- Create: `app/src/features/printing/lib/openPrintWindow.ts`, `printingForm.css`
- Test: `app/convex/__tests__/printing.test.ts`, `app/src/features/printing/components/PrintingConfirmationForm.test.tsx`
- Visual: `app/e2e/printing-form.visual.spec.ts`

**Interfaces:**
- Produces examiner, DECA, and printing acknowledgement mutations with expected-version checks.
- Produces `buildPrintingPages(confirmation: PrintingConfirmationView): PrintingPageModel[]`; each page represents First Submission plus Revision 1 and Revision 2, with additional pages for later groups.

```ts
export type PrintingPageModel = {
  pageNumber: number;
  absoluteRevisionNumbers: [number, number | null, number | null];
  labels: [string, string, string];
};

export type PrintingConfirmationView = {
  submissionCount: number;
  academicYear: string;
  sessionCode: string;
  courseCode: string;
  courseTitle: string;
};
```

- [ ] **Step 1: Write role and sequence tests**

Assert examiner-only first section, dean/DD-only DECA section, printing-staff-only acknowledgement, immutable confirmed sections, correct status sequence, and closure timestamp.

- [ ] **Step 2: Write continuation-page tests**

```ts
const makeConfirmation = (submissionCount: number): PrintingConfirmationView => ({
  submissionCount,
  academicYear: "2025/2026",
  sessionCode: "202601",
  courseCode: "BTMH3523",
  courseTitle: "Power Electronics and Drives",
});

expect(buildPrintingPages(makeConfirmation(3))).toHaveLength(1);
expect(buildPrintingPages(makeConfirmation(4))).toHaveLength(2);
expect(buildPrintingPages(makeConfirmation(7))).toHaveLength(3);
```

- [ ] **Step 3: Implement structured confirmation data and mutations**

Store all six checklist items, A4/A3 details, examiner fields, DECA FS/Rev1/Rev2 values and remarks, resubmission dates/signatures, and printing receipt fields. Populate academic metadata from the case rather than editable user input.

- [ ] **Step 4: Reproduce the retained A4 template**

Use millimetre-based print CSS, explicit black/white colors, fixed table geometry, and no Tailwind color classes inside the print document. Keep parent React DOM untouched; `openPrintWindow` writes a separate document, calls print, then closes.

- [ ] **Step 5: Add visual regression**

At an A4-equivalent viewport, capture the first page and compare it with `../forms/confirmation printing form.png`. Store the approved baseline threshold only after checking text and geometry manually. Add a second assertion for a four-submission continuation page.

- [ ] **Step 6: Verify**

Run: `rtk bun test convex/__tests__/printing.test.ts src/features/printing/components/PrintingConfirmationForm.test.tsx && rtk bunx playwright test e2e/printing-form.visual.spec.ts && rtk bunx tsc --noEmit`  
Expected: sequence tests and A4 visual comparison pass.

---

### Task 13: Implement Faculty Gmail OAuth with Encrypted Tokens

**Files:**
- Create: `app/convex/gmail.ts`, `app/convex/gmailActions.ts`
- Modify: `app/convex/http.ts`
- Create: `app/src/features/gmail/components/GmailSettingsPage.tsx`, `GmailConnectionCard.tsx`
- Create: `app/src/routes/admin.gmail.tsx`
- Test: `app/convex/__tests__/gmail.test.ts`, `app/src/features/gmail/components/GmailConnectionCard.test.tsx`

**Interfaces:**
- Produces `gmail.createAuthorizationUrl`, callback exchange, `gmail.getConnectionStatus`, `gmail.disconnect`.
- Produces Node-only `encryptToken`, `decryptToken` using AES-256-GCM with unique IV and authenticated tag.
- OAuth scope is exactly `https://www.googleapis.com/auth/gmail.send`; request offline access.

- [ ] **Step 1: Write OAuth state and encryption tests**

Test admin-only connection, signed single-use state, state expiry, callback faculty binding, non-Gmail scope rejection, encryption round trip, different ciphertext for same plaintext, token non-disclosure, and reconnect behavior.

- [ ] **Step 2: Implement authorization URL creation**

Use Google's Node OAuth client. Set `access_type: "offline"`, `prompt: "consent"`, exact callback URI, Gmail send scope, and a cryptographically random state stored with administrator/faculty/expiry.

- [ ] **Step 3: Implement callback exchange and encrypted persistence**

The public callback validates state before code exchange. The Node action exchanges the code, encrypts tokens, and calls an internal mutation. Never return tokens to the browser.

- [ ] **Step 4: Implement settings UI**

Display sender email, connection state, last success/failure, connect/reconnect, and disconnect. Never render token fields.

- [ ] **Step 5: Verify**

Run: `rtk bun test convex/__tests__/gmail.test.ts src/features/gmail/components/GmailConnectionCard.test.tsx && rtk bunx tsc --noEmit`  
Expected: state, encryption, and role tests pass.

---

### Task 14: Implement Email Jobs, Templates, Retries, and Reminders

**Files:**
- Create: `app/convex/emailJobs.ts`, `app/convex/emailActions.ts`
- Modify: `app/convex/crons.ts`, `app/convex/workflow.ts`
- Create: `app/src/features/gmail/components/FailedEmailJobs.tsx`
- Test: `app/convex/__tests__/emailJobs.test.ts`

**Interfaces:**
- Produces `enqueueWorkflowEmails(ctx, event: WorkflowEmailEvent): Promise<void>` internal helper.
- Produces internal action `emailActions.deliver({ emailJobId })`.
- Idempotency key: `eventType:caseId:revisionOrTransition:recipientNormalizedEmail`.
- Retry delays: 1 minute, 5 minutes, 30 minutes, 2 hours.

```ts
export type WorkflowEmailEvent = {
  eventType:
    | "submitted" | "returned" | "resubmitted" | "advanced"
    | "team_assigned" | "examiner_requested" | "deca_requested"
    | "printing_requested" | "closed" | "deadline_reminder"
    | "overdue" | "reopened";
  caseId: Id<"moderationCases">;
  revisionNumber: number;
  recipientUserIds: Id<"users">[];
};
```

- [ ] **Step 1: Write idempotency and retry tests**

Test duplicate enqueue, successful send, transient retry schedule, terminal failure after four retries, manual retry without logical duplication, disconnected Gmail, token refresh, and workflow persistence despite send failure.

- [ ] **Step 2: Implement event templates**

Create deterministic subject/body builders for first submission, every return/resubmission/advancement, team assignment, examiner/DECA/printing request, closure, 7/3/1-day reminders, one overdue notice, and reopening. Include secure app links only; exclude attachments and R2 URLs.

- [ ] **Step 3: Implement delivery action**

Decrypt credentials in the Node action, refresh expired access tokens, encode RFC 2822 message as base64url, call Gmail `users.messages.send` for `userId=me`, and record provider message ID. Classify HTTP 429/5xx/network failures as retryable and revoked credentials as reconnect-required.

- [ ] **Step 4: Implement durable scheduling**

Workflow mutations insert idempotent jobs and schedule immediate delivery. Delivery failure records an attempt and schedules the next allowed delay. Daily cron enqueues deadline reminders and overdue notices with idempotency protection.

- [ ] **Step 5: Implement failed-job administration and verify**

Run: `rtk bun test convex/__tests__/emailJobs.test.ts && rtk bunx tsc --noEmit`  
Expected: idempotency, retry, and reminder tests pass.

---

### Task 15: Implement Dashboard Counters, Audit Views, and Retention Controls

**Files:**
- Create: `app/convex/dashboard.ts`, `app/convex/retention.ts`
- Create: `app/src/features/dashboard/components/DashboardPage.tsx`, `StageCountCards.tsx`, `CaseFilters.tsx`, `ActionQueueTable.tsx`
- Create: `app/src/features/users/components/AuditTimeline.tsx`
- Modify: `app/convex/crons.ts`
- Test: `app/convex/__tests__/dashboard.test.ts`, `retention.test.ts`, `app/src/features/dashboard/components/DashboardPage.test.tsx`

**Interfaces:**
- Produces counters by faculty/year/session/status and a bounded action queue.
- Produces `dashboard.reconcileCounters` internal bounded/self-rescheduling mutation.
- Produces retention query and explicit admin purge mutation.

- [ ] **Step 1: Write counter and retention tests**

Test counter changes for submission/return/proceed/close, filter isolation, reconciliation, exact seven-year eligibility from closure, no early purge, referenced-object protection, and audit retention.

- [ ] **Step 2: Implement transactional counters**

Every case transition decrements the prior counter and increments the next counter in the same mutation. Reconciliation scans bounded pages and self-schedules; never use `.collect().length`.

- [ ] **Step 3: Implement first-release dashboard**

Show total visible cases, counts by stage, current-user action queue, overdue first submissions, and filters for academic year/session/stage/status/course search. Exclude advanced trend analytics.

- [ ] **Step 4: Implement controlled retention eligibility and purge**

Daily cron marks eligible cases only. Explicit admin purge rechecks closure age, legal references, and R2 object ownership; records audit intent/result and removes objects before tombstoning records. Do not auto-purge on eligibility.

- [ ] **Step 5: Verify milestone**

Run:

```bash
rtk bun test convex/__tests__/dashboard.test.ts convex/__tests__/retention.test.ts src/features/dashboard/components/DashboardPage.test.tsx
rtk bunx tsc --noEmit
rtk bun run build
```

Expected: counters, retention, dashboard tests, and build pass.

---

### Task 16: Complete Critical Browser Flows, Accessibility, and Operational Documentation

**Files:**
- Create: `app/e2e/submission-forward.spec.ts`, `return-resubmit.spec.ts`, `team-moderation.spec.ts`, `printing-flow.spec.ts`, `access-denial.spec.ts`
- Create: `app/e2e/accessibility.spec.ts`
- Create: `app/tests/fixtures/seed.ts`
- Create: `app/README.md`, `app/docs/DEPLOYMENT.md`, `app/docs/OPERATIONS.md`
- Modify: `app/src/features/shell/components/AppSidebar.tsx`, `app/src/features/moderation/components/CaseWorkspace.tsx`, `app/src/features/imports/components/ImportPreviewTable.tsx`, `app/src/features/printing/components/PrintingConfirmationForm.tsx`, `app/src/styles.css`

**Interfaces:**
- Produces deterministic seed identities/cases for each role and workflow state.
- Produces deployment steps for Convex, Google Auth, Gmail OAuth, R2 credentials/CORS, and SPA hosting.
- Produces operations steps for user activation, failed email retry, counter reconciliation, retention review, and Gmail reconnect.

- [ ] **Step 1: Create deterministic seed fixtures**

Seed one administrator, course leader, moderator, finalizer, two team members, dean/DD, examiner, printing staff, unrelated user, and disabled user. Seed cases for forward, return, team, printing, overdue, and access-denial scenarios.

- [ ] **Step 2: Implement five critical browser tests**

Cover full forward submission, selective replacement/direct return path, all-member team approval, three-section printing confirmation, and unrelated-user route/file denial. Mock Gmail and R2 adapters deterministically; keep the separate printing visual test real at the DOM/render level.

- [ ] **Step 3: Implement accessibility checks**

Use `@axe-core/playwright` on login, dashboard, case workspace, import preview, and printing confirmation. Also verify keyboard focus reaches sidebar, document actions, forms, timeline, textarea, and decision buttons in logical order.

- [ ] **Step 4: Write operational documentation**

`DEPLOYMENT.md` contains exact configuration names, authorized origins/redirect URIs, R2 CORS methods, Convex setup, and production verification. `OPERATIONS.md` contains no secret values and gives exact UI paths for routine recovery actions.

- [ ] **Step 5: Run the complete gate**

```bash
rtk bun test
rtk bunx tsc --noEmit
rtk bun run build
rtk bunx playwright test
```

Expected: all unit/component/backend tests pass, zero type errors, successful production build, and all browser/visual/accessibility tests pass.

- [ ] **Step 6: Perform the two real-integration smoke tests**

In a non-production deployment:

1. Upload and preview one valid PDF through real R2, then confirm an unrelated user cannot obtain a URL.
2. Connect the faculty Gmail account, send one test workflow email, confirm provider message ID, disconnect/reconnect, and send again.

Record only pass/fail timestamps and non-secret correlation IDs in `app/docs/OPERATIONS.md`; never record tokens or signed URLs.

## Specification Coverage Matrix

| Design requirement | Implementation task(s) |
|---|---|
| Scope, stack, conventions | Tasks 1–2 |
| Institutional Google sign-in and disabled provisioning | Task 3 |
| Server authorization and administrator non-impersonation | Tasks 3, 6, 10–12 |
| Responsive MUJI-inspired shell and routes | Task 4 |
| Academic years, sessions, and subjects | Task 5 |
| Users, capabilities, assignments, and placeholders | Task 6 |
| Excel template and atomic import | Task 7 |
| Private R2 PDF lifecycle and preview | Task 8 |
| Question/marking cover forms and drafts | Task 9 |
| Immutable revisions, deadlines, returns, and locking | Task 10 |
| Moderator/finalizer/team/dean workspace and comments | Task 11 |
| Exact printing form and continuation pages | Task 12 |
| Faculty Gmail OAuth and encrypted tokens | Task 13 |
| Email events, retries, reminders, and failures | Task 14 |
| Dashboard counters, audit visibility, and seven-year retention | Task 15 |
| Browser flows, accessibility, deployment, and operations | Task 16 |

## Execution Checkpoints

Because the workspace is non-Git, use these explicit review checkpoints instead of commits:

1. Tasks 1–4: foundation/auth/shell review
2. Tasks 5–7: administration/import review
3. Tasks 8–9: storage/submission review
4. Tasks 10–12: workflow/printing review
5. Tasks 13–15: Gmail/dashboard/retention review
6. Task 16: final release review

At each checkpoint, preserve the passing `bun.lock`, test output summary, and any approved visual baseline. Do not continue past a failing typecheck, focused test, or milestone build.
