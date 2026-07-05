# Task 3 Report: Implement Authentication, Provisioning, and Authorization

## 1. What was Implemented

### Backend (Convex)
- **User Provisioning callback (`createOrUpdateUser` in `app/convex/auth.ts`)**:
  - Email normalization (`email.trim().toLowerCase()`).
  - Domain enforcement ensuring email ends strictly with `@tarc.edu.my`.
  - Automatic identification of the bootstrap admin user (granting `isAdmin` and `isActive` privileges).
  - Linking new sign-ins with pre-existing disabled placeholder users when normalized email matches, updating profile details (name, image), and setting `linkedAt`.
- **Authorization Helper module (`app/convex/lib/authorization.ts`)**:
  - `requireActiveUser(ctx)`: Retrieves authenticated user via Convex Auth's `getAuthUserId`. Throws `UNAUTHENTICATED` if not found or unauthenticated, and `ACCOUNT_DISABLED` if `isActive` is false.
  - `requireAdmin(ctx)`: Wraps `requireActiveUser` and verifies `isAdmin === true`. Throws `FORBIDDEN` if not admin.
  - `requireCaseAccess(ctx, caseId)`: Implements access control matrix. Admins get global read access. Assigned actors (CL, moderator, finalizer, dean, examiner, team members) get access. Printing staff (`isPrintingStaff === true`) gets access only when case status is `awaiting_printing_acknowledgement` or `closed`. Others receive `FORBIDDEN`.
    - **Optimization**: Replaced slow `.filter()` queries with a compound index lookups (`by_assignment_user` on `assignmentTeamMembers` table).
  - `requireCaseActor(ctx, caseId, role)`: Strictly checks if caller user is assigned to a specific role for a case. Emphasizes *administrator non-impersonation* (admins cannot act in workflow roles unless assigned).
- **Audit Helper module (`app/convex/lib/audit.ts`)**:
  - `logAuditEvent(ctx, args)` helper function to insert records into the `auditLogs` table.
- **User API endpoints (`app/convex/users.ts`)**:
  - `users.current` public query.
  - `users.list` admin query.
  - `users.updateUser` admin mutation.
  - **Return Validators**: Defined `userValidator` schema for typing all user functions. Added `returns` fields to current, list, and updateUser.
  - **Pagination Constraint**: Modified `list` query to cap results using `.take(100)` rather than unbounded `.collect()`.
- **Test-Only helpers (`app/convex/testHelpers.ts`)**:
  - Exposed internal helper functions for authorization matrix unit tests.

### Frontend (React SPA)
- **Hooks & Store**:
  - `useCurrentUser.ts` hook: queries `users.current` to provide loading and profile details.
  - `useAuthStore.ts` Zustand store: caches user authentication attributes.
- **Visual & UI Components**:
  - `LoginCard.tsx`: Sign-in screen using Google OAuth with premium aesthetic dark-slate glassmorphism and subtle animations.
  - `PendingCard.tsx`: Display for disabled/new users waiting for admin approval, featuring a Sign Out option to prevent trap state.
  - `AuthGuard.tsx`: Component protecting children, requiring an active authenticated user.
- **Routes & Navigation (`app/src/routes/`)**:
  - `login.tsx` and `pending.tsx` routes rendering their respective screens.
  - Updated root route `__root.tsx` to handle authentication boundaries via `<AuthLoading>`, `<Unauthenticated>`, `<Authenticated>` and perform smart route redirects.
    - **Optimization**: Returns `null` instead of rendering `<Outlet />` when redirecting unauthenticated or inactive users to prevent query console errors and single-frame visual flashes.

---

## 2. Test Coverage & Results

### TDD Evidence

#### RED Phase (Expected Failures before implementation)
Run command:
```bash
bun run test convex/__tests__/authorization.test.ts
```
Expected Output excerpt showing test failures due to missing implementation:
```
FAIL  convex/__tests__/authorization.test.ts > Authorization and Provisioning > Authorization Helpers > throws FORBIDDEN for non-admin on requireAdmin
AssertionError: expected [Function] to throw error matching /FORBIDDEN/ but got '{"code":"UNAUTHENTICATED","message":"…'

- Expected:
/FORBIDDEN/

+ Received:
"{\"code\":\"UNAUTHENTICATED\",\"message\":\"UNAUTHENTICATED\"}"
```

#### GREEN Phase (Passing after implementation and fixes)
Run command:
```bash
bun run test
```
Passing Output:
```
$ vitest run

 RUN  v4.1.9 /Users/lumky/Documents/GitHub/TestExam/app

 ✓ src/lib/smoke.test.ts (1 test) 2ms
 ✓ convex/__tests__/schema.test.ts (1 test) 3ms
 ✓ src/features/auth/components/AuthGuard.test.tsx (4 tests) 21ms
 ✓ convex/__tests__/authorization.test.ts (20 tests) 32ms

 Test Files  4 passed (4)
      Tests  26 passed (26)
   Start at  16:41:05
   Duration  879ms (transform 183ms, setup 0ms, import 496ms, tests 57ms, environment 2.30s)
```

---

## 3. Files Changed
- **Created**:
  - `app/convex/lib/audit.ts`
  - `app/convex/lib/authorization.ts`
  - `app/convex/users.ts`
  - `app/convex/testHelpers.ts`
  - `app/convex/__tests__/authorization.test.ts`
  - `app/src/features/auth/hooks/useCurrentUser.ts`
  - `app/src/features/auth/store/useAuthStore.ts`
  - `app/src/features/auth/components/LoginCard.tsx`
  - `app/src/features/auth/components/PendingCard.tsx`
  - `app/src/features/auth/components/AuthGuard.tsx`
  - `app/src/features/auth/components/AuthGuard.test.tsx`
  - `app/src/routes/login.tsx`
  - `app/src/routes/pending.tsx`
- **Modified**:
  - `app/convex/auth.ts`
  - `app/convex/schema.ts` (added compound index `by_assignment_user` on `assignmentTeamMembers` table)
  - `app/src/routes/__root.tsx`
  - `app/src/routeTree.gen.ts` (automatically updated by build step)
  - `app/convex/_generated/api.d.ts` (automatically updated)

---

## 4. Self-Review Findings
- **Completeness**: Evaluated every requirement (unauthenticated, disabled, unrelated, admin read-only access, admin non-impersonation, assigned actor access, and placeholder linkage by normalized email).
- **Quality**: Strong type safety, clean separation of concerns, and clean verbatim imports syntax. Fully satisfied Convex return validation constraints, capped user queries, and completely avoided query filters.
- **Design & Aesthetics**: Premium layout on login and pending pages, styling with deep slate/amber alert designs, fully functional with TailwindCSS and Lucide React.
- **Testing**: Clean test suite with zero noise and comprehensive coverage.
