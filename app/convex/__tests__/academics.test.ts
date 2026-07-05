/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

// ─── helpers ─────────────────────────────────────────────────────────────────

async function makeAdmin(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      normalizedEmail: "admin@tarc.edu.my",
      isAdmin: true,
      isPrintingStaff: false,
      isActive: true,
    });
  });
}

async function makeUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      normalizedEmail: "user@tarc.edu.my",
      isAdmin: false,
      isPrintingStaff: false,
      isActive: true,
    });
  });
}

async function makeFaculty(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    return ctx.db.insert("faculties", {
      name: "Faculty of Computing",
      code: "FOCS",
      isActive: true,
    });
  });
}

// ─── Academic Years ───────────────────────────────────────────────────────────

describe("Academic Years", () => {
  describe("createAcademicYear", () => {
    it("creates a valid academic year with YYYY/YYYY format", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);

      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      const year = await t.run(async (ctx) => ctx.db.get(yearId));
      expect(year).not.toBeNull();
      expect(year?.label).toBe("2025/2026");
      expect(year?.isActive).toBe(true);
    });

    it("rejects invalid year format (not YYYY/YYYY)", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);

      await expect(
        t.withIdentity({ subject: adminId }).mutation(
          api.academicYears.createAcademicYear,
          { label: "2025-2026" }
        )
      ).rejects.toThrow();
    });

    it("rejects year where second is not first+1", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);

      await expect(
        t.withIdentity({ subject: adminId }).mutation(
          api.academicYears.createAcademicYear,
          { label: "2025/2027" }
        )
      ).rejects.toThrow();
    });

    it("rejects duplicate academic year label", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);

      await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      await expect(
        t.withIdentity({ subject: adminId }).mutation(
          api.academicYears.createAcademicYear,
          { label: "2025/2026" }
        )
      ).rejects.toThrow();
    });

    it("rejects unauthenticated call", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.academicYears.createAcademicYear, { label: "2025/2026" })
      ).rejects.toThrow();
    });

    it("rejects non-admin call (FORBIDDEN)", async () => {
      const t = convexTest(schema, modules);
      const userId = await makeUser(t);

      await expect(
        t.withIdentity({ subject: userId }).mutation(
          api.academicYears.createAcademicYear,
          { label: "2025/2026" }
        )
      ).rejects.toThrow(/FORBIDDEN/);
    });
  });

  describe("listAcademicYears", () => {
    it("returns paginated results", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);

      await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2024/2025" }
      );
      await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      const result = await t.withIdentity({ subject: adminId }).query(
        api.academicYears.listAcademicYears,
        { paginationOpts: { numItems: 10, cursor: null } }
      );

      expect(result.page.length).toBeGreaterThanOrEqual(2);
    });

    it("active-only filter returns only active rows", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);

      const id1 = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2023/2024" }
      );
      await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2024/2025" }
      );

      // deactivate first year
      await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.deactivateAcademicYear,
        { id: id1 }
      );

      const result = await t.withIdentity({ subject: adminId }).query(
        api.academicYears.listAcademicYears,
        { paginationOpts: { numItems: 10, cursor: null }, activeOnly: true }
      );

      expect(result.page.every((y) => y.isActive)).toBe(true);
    });
  });

  describe("deactivateAcademicYear / restoreAcademicYear", () => {
    it("deactivates an academic year", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);

      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.deactivateAcademicYear,
        { id: yearId }
      );

      const year = await t.run(async (ctx) => ctx.db.get(yearId));
      expect(year?.isActive).toBe(false);
    });

    it("restores a deactivated academic year", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);

      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.deactivateAcademicYear,
        { id: yearId }
      );
      await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.restoreAcademicYear,
        { id: yearId }
      );

      const year = await t.run(async (ctx) => ctx.db.get(yearId));
      expect(year?.isActive).toBe(true);
    });

    it("deactivate is admin-only", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const userId = await makeUser(t);

      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      await expect(
        t.withIdentity({ subject: userId }).mutation(
          api.academicYears.deactivateAcademicYear,
          { id: yearId }
        )
      ).rejects.toThrow(/FORBIDDEN/);
    });
  });
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

describe("Academic Sessions", () => {
  describe("createSession", () => {
    it("creates a valid session with code ending 01", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);
      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      const sessionId = await t.withIdentity({ subject: adminId }).mutation(
        api.sessions.createSession,
        { sessionCode: "202501", facultyId, academicYearId: yearId }
      );

      const session = await t.run(async (ctx) => ctx.db.get(sessionId));
      expect(session?.sessionCode).toBe("202501");
      expect(session?.isActive).toBe(true);
    });

    it("creates a valid session with code ending 05", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);
      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      const sessionId = await t.withIdentity({ subject: adminId }).mutation(
        api.sessions.createSession,
        { sessionCode: "202505", facultyId, academicYearId: yearId }
      );

      const session = await t.run(async (ctx) => ctx.db.get(sessionId));
      expect(session?.sessionCode).toBe("202505");
    });

    it("creates a valid session with code ending 09", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);
      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      const sessionId = await t.withIdentity({ subject: adminId }).mutation(
        api.sessions.createSession,
        { sessionCode: "202509", facultyId, academicYearId: yearId }
      );

      const session = await t.run(async (ctx) => ctx.db.get(sessionId));
      expect(session?.sessionCode).toBe("202509");
    });

    it("rejects session code not ending in 01, 05, or 09", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);
      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      await expect(
        t.withIdentity({ subject: adminId }).mutation(
          api.sessions.createSession,
          { sessionCode: "202503", facultyId, academicYearId: yearId }
        )
      ).rejects.toThrow();
    });

    it("rejects session code with wrong length", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);
      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      await expect(
        t.withIdentity({ subject: adminId }).mutation(
          api.sessions.createSession,
          { sessionCode: "20251", facultyId, academicYearId: yearId }
        )
      ).rejects.toThrow();
    });

    it("rejects duplicate session (same faculty+year+code)", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);
      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      await t.withIdentity({ subject: adminId }).mutation(
        api.sessions.createSession,
        { sessionCode: "202501", facultyId, academicYearId: yearId }
      );

      await expect(
        t.withIdentity({ subject: adminId }).mutation(
          api.sessions.createSession,
          { sessionCode: "202501", facultyId, academicYearId: yearId }
        )
      ).rejects.toThrow();
    });

    it("rejects non-admin (FORBIDDEN)", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const userId = await makeUser(t);
      const facultyId = await makeFaculty(t);
      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      await expect(
        t.withIdentity({ subject: userId }).mutation(
          api.sessions.createSession,
          { sessionCode: "202501", facultyId, academicYearId: yearId }
        )
      ).rejects.toThrow(/FORBIDDEN/);
    });
  });

  describe("listSessions", () => {
    it("returns paginated sessions", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);
      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      await t.withIdentity({ subject: adminId }).mutation(
        api.sessions.createSession,
        { sessionCode: "202501", facultyId, academicYearId: yearId }
      );

      const result = await t.withIdentity({ subject: adminId }).query(
        api.sessions.listSessions,
        { paginationOpts: { numItems: 10, cursor: null } }
      );

      expect(result.page.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("deactivateSession / restoreSession", () => {
    it("deactivates and restores a session", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);
      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );

      const sessionId = await t.withIdentity({ subject: adminId }).mutation(
        api.sessions.createSession,
        { sessionCode: "202501", facultyId, academicYearId: yearId }
      );

      await t.withIdentity({ subject: adminId }).mutation(
        api.sessions.deactivateSession,
        { id: sessionId }
      );

      let session = await t.run(async (ctx) => ctx.db.get(sessionId));
      expect(session?.isActive).toBe(false);

      await t.withIdentity({ subject: adminId }).mutation(
        api.sessions.restoreSession,
        { id: sessionId }
      );

      session = await t.run(async (ctx) => ctx.db.get(sessionId));
      expect(session?.isActive).toBe(true);
    });
  });
});

// ─── Subjects ─────────────────────────────────────────────────────────────────

describe("Subjects", () => {
  describe("createSubject", () => {
    it("creates a valid subject with uppercase course code", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      const subjectId = await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BTMH3523", courseTitle: "Database Systems", facultyId }
      );

      const subject = await t.run(async (ctx) => ctx.db.get(subjectId));
      expect(subject?.courseCode).toBe("BTMH3523");
      expect(subject?.isActive).toBe(true);
    });

    it("normalizes lowercase course code to uppercase before persistence", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      const subjectId = await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "btmh3523", courseTitle: "Database Systems", facultyId }
      );

      const subject = await t.run(async (ctx) => ctx.db.get(subjectId));
      expect(subject?.courseCode).toBe("BTMH3523");
    });

    it("normalizes mixed case course code to uppercase before persistence", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      const subjectId = await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BtMh3523", courseTitle: "Database Systems", facultyId }
      );

      const subject = await t.run(async (ctx) => ctx.db.get(subjectId));
      expect(subject?.courseCode).toBe("BTMH3523");
    });

    it("trims whitespace from courseTitle before persistence", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      const subjectId = await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BACS1014", courseTitle: "  Intro to Programming  ", facultyId }
      );

      const subject = await t.run(async (ctx) => ctx.db.get(subjectId));
      expect(subject?.courseTitle).toBe("Intro to Programming");
    });

    it("rejects code not matching [A-Z]{4}[0-9]{4} pattern (after normalization)", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      // only 3 letters
      await expect(
        t.withIdentity({ subject: adminId }).mutation(
          api.subjects.createSubject,
          { courseCode: "BTM3523", courseTitle: "Database Systems", facultyId }
        )
      ).rejects.toThrow();
    });

    it("rejects code with numbers in the letter section", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      await expect(
        t.withIdentity({ subject: adminId }).mutation(
          api.subjects.createSubject,
          { courseCode: "B1MH3523", courseTitle: "Database Systems", facultyId }
        )
      ).rejects.toThrow();
    });

    it("rejects duplicate course code within the same faculty", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BTMH3523", courseTitle: "Database Systems", facultyId }
      );

      await expect(
        t.withIdentity({ subject: adminId }).mutation(
          api.subjects.createSubject,
          { courseCode: "BTMH3523", courseTitle: "Another Subject", facultyId }
        )
      ).rejects.toThrow();
    });

    it("rejects non-admin call (FORBIDDEN)", async () => {
      const t = convexTest(schema, modules);
      const userId = await makeUser(t);
      const facultyId = await makeFaculty(t);

      await expect(
        t.withIdentity({ subject: userId }).mutation(
          api.subjects.createSubject,
          { courseCode: "BTMH3523", courseTitle: "Database Systems", facultyId }
        )
      ).rejects.toThrow(/FORBIDDEN/);
    });
  });

  describe("updateSubject", () => {
    it("updates subject title and code", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      const subjectId = await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BTMH3523", courseTitle: "Old Title", facultyId }
      );

      await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.updateSubject,
        { id: subjectId, courseCode: "BTMH3523", courseTitle: "New Title", facultyId }
      );

      const subject = await t.run(async (ctx) => ctx.db.get(subjectId));
      expect(subject?.courseTitle).toBe("New Title");
    });

    it("cannot materially alter subject referenced by a submitted case", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      const yearId = await t.withIdentity({ subject: adminId }).mutation(
        api.academicYears.createAcademicYear,
        { label: "2025/2026" }
      );
      const sessionId = await t.withIdentity({ subject: adminId }).mutation(
        api.sessions.createSession,
        { sessionCode: "202501", facultyId, academicYearId: yearId }
      );
      const subjectId = await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BTMH3523", courseTitle: "Database Systems", facultyId }
      );

      // Create an assignment and a submitted case
      await t.run(async (ctx) => {
        const userId = adminId;
        const assignmentId = await ctx.db.insert("assignments", {
          academicSessionId: sessionId,
          subjectId,
          examinationType: "main",
          level: "bachelor",
          courseLeaderId: userId,
          moderatorId: userId,
          finalizerId: userId,
          deanId: userId,
          examinerId: userId,
          firstSubmissionDeadline: Date.now() + 86400,
          timezone: "Asia/Kuala_Lumpur",
          isActive: true,
        });

        // Insert a case in a "submitted" state (beyond draft)
        await ctx.db.insert("moderationCases", {
          assignmentId,
          status: "awaiting_moderator",
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.withIdentity({ subject: adminId }).mutation(
          api.subjects.updateSubject,
          { id: subjectId, courseCode: "XXXX9999", courseTitle: "Changed Title", facultyId }
        )
      ).rejects.toThrow();
    });
  });

  describe("listSubjects", () => {
    it("returns paginated subjects", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BACS1014", courseTitle: "Intro to Programming", facultyId }
      );
      await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BTMH3523", courseTitle: "Database Systems", facultyId }
      );

      const result = await t.withIdentity({ subject: adminId }).query(
        api.subjects.listSubjects,
        { paginationOpts: { numItems: 10, cursor: null } }
      );

      expect(result.page.length).toBeGreaterThanOrEqual(2);
    });

    it("activeOnly filter excludes inactive subjects", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      const id1 = await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BACS1014", courseTitle: "Intro to Programming", facultyId }
      );
      await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BTMH3523", courseTitle: "Database Systems", facultyId }
      );

      await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.deactivateSubject,
        { id: id1 }
      );

      const result = await t.withIdentity({ subject: adminId }).query(
        api.subjects.listSubjects,
        { paginationOpts: { numItems: 10, cursor: null }, activeOnly: true }
      );

      expect(result.page.every((s) => s.isActive)).toBe(true);
    });
  });

  describe("deactivateSubject / restoreSubject", () => {
    it("deactivates and restores a subject", async () => {
      const t = convexTest(schema, modules);
      const adminId = await makeAdmin(t);
      const facultyId = await makeFaculty(t);

      const subjectId = await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.createSubject,
        { courseCode: "BACS1014", courseTitle: "Intro to Programming", facultyId }
      );

      await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.deactivateSubject,
        { id: subjectId }
      );

      let subject = await t.run(async (ctx) => ctx.db.get(subjectId));
      expect(subject?.isActive).toBe(false);

      await t.withIdentity({ subject: adminId }).mutation(
        api.subjects.restoreSubject,
        { id: subjectId }
      );

      subject = await t.run(async (ctx) => ctx.db.get(subjectId));
      expect(subject?.isActive).toBe(true);
    });
  });
});
