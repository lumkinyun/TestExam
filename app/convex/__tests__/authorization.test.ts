/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it, beforeAll } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
import { createOrUpdateUser } from "../auth";

const modules = import.meta.glob("../**/*.ts");

describe("Authorization and Provisioning", () => {
  beforeAll(() => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = "bootstrap@tarc.edu.my";
  });

  // Provisioning tests
  describe("Provisioning / createOrUpdateUser callback", () => {
    it("rejects emails not ending in @tarc.edu.my", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        await expect(
          createOrUpdateUser(ctx, {
            existingUserId: null,
            type: "oauth",
            provider: { id: "google", type: "oauth" },
            profile: { email: "outsider@gmail.com", emailVerified: true },
          })
        ).rejects.toThrow(/unauthorized/i);
      });
    });

    it("creates disabled user for valid domain without placeholder", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        const userId = await createOrUpdateUser(ctx, {
          existingUserId: null,
          type: "oauth",
          provider: { id: "google", type: "oauth" },
          profile: { email: "student@tarc.edu.my", name: "Student", image: "img_url", emailVerified: true },
        });

        const user = await ctx.db.get(userId);
        expect(user).toBeDefined();
        expect(user?.email).toBe("student@tarc.edu.my");
        expect(user?.normalizedEmail).toBe("student@tarc.edu.my");
        expect(user?.isActive).toBe(false);
        expect(user?.isAdmin).toBe(false);
        expect(user?.linkedAt).toBeDefined();
      });
    });

    it("creates active admin for bootstrap email", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        const userId = await createOrUpdateUser(ctx, {
          existingUserId: null,
          type: "oauth",
          provider: { id: "google", type: "oauth" },
          profile: { email: "BOOTSTRAP@TARC.EDU.MY", name: "Admin", emailVerified: true },
        });

        const user = await ctx.db.get(userId);
        expect(user).toBeDefined();
        expect(user?.normalizedEmail).toBe("bootstrap@tarc.edu.my");
        expect(user?.isActive).toBe(true);
        expect(user?.isAdmin).toBe(true);
      });
    });

    it("links Google identity to existing placeholder user and updates details", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        // Pre-insert a placeholder user (disabled, no name/image)
        const placeholderId = await ctx.db.insert("users", {
          normalizedEmail: "staff@tarc.edu.my",
          isAdmin: false,
          isPrintingStaff: true,
          isActive: false,
        });

        const linkedId = await createOrUpdateUser(ctx, {
          existingUserId: null,
          type: "oauth",
          provider: { id: "google", type: "oauth" },
          profile: { email: "staff@tarc.edu.my", name: "Staff Name", image: "img_url", emailVerified: true },
        });

        expect(linkedId).toBe(placeholderId);

        const user = await ctx.db.get(placeholderId);
        expect(user?.name).toBe("Staff Name");
        expect(user?.image).toBe("img_url");
        expect(user?.isActive).toBe(false); // remains disabled
        expect(user?.isPrintingStaff).toBe(true); // retains custom field
        expect(user?.linkedAt).toBeDefined();
      });
    });
  });

  // Authorization tests
  describe("Authorization Helpers", () => {
    it("throws UNAUTHENTICATED on public current query without identity", async () => {
      const t = convexTest(schema, modules);
      await expect(
        t.query(api.users.current, {})
      ).rejects.toThrow(/UNAUTHENTICATED/);
    });

    it("throws UNAUTHENTICATED on public current query if identity user does not exist in DB", async () => {
      const t = convexTest(schema, modules);
      await expect(
        t.withIdentity({ subject: "non_existent_id" }).query(api.users.current, {})
      ).rejects.toThrow(/UNAUTHENTICATED/);
    });

    it("allows current query for authenticated and disabled user", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          normalizedEmail: "user@tarc.edu.my",
          isAdmin: false,
          isPrintingStaff: false,
          isActive: false, // disabled
        });
      });

      const user = await t.withIdentity({ subject: userId }).query(api.users.current, {});
      expect(user).toBeDefined();
      expect(user._id).toBe(userId);
    });

    it("throws ACCOUNT_DISABLED for disabled user on requireActiveUser", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          normalizedEmail: "user@tarc.edu.my",
          isAdmin: false,
          isPrintingStaff: false,
          isActive: false, // disabled
        });
      });

      await expect(
        t.withIdentity({ subject: userId }).query(api.testHelpers.testRequireActiveUser, {})
      ).rejects.toThrow(/ACCOUNT_DISABLED/);
    });

    it("allows requireActiveUser for active user", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          normalizedEmail: "user@tarc.edu.my",
          isAdmin: false,
          isPrintingStaff: false,
          isActive: true, // active
        });
      });

      const user = await t.withIdentity({ subject: userId }).query(api.testHelpers.testRequireActiveUser, {});
      expect(user._id).toBe(userId);
    });

    it("throws FORBIDDEN for non-admin on requireAdmin", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          normalizedEmail: "user@tarc.edu.my",
          isAdmin: false,
          isPrintingStaff: false,
          isActive: true,
        });
      });

      await expect(
        t.withIdentity({ subject: userId }).query(api.testHelpers.testRequireAdmin, {})
      ).rejects.toThrow(/FORBIDDEN/);
    });

    it("allows requireAdmin for admin", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          normalizedEmail: "admin@tarc.edu.my",
          isAdmin: true,
          isPrintingStaff: false,
          isActive: true,
        });
      });

      const user = await t.withIdentity({ subject: userId }).query(api.testHelpers.testRequireAdmin, {});
      expect(user._id).toBe(userId);
    });

    // Case Access Tests
    describe("Case Access rules", () => {
      let facultyId: any;
      let sessionId: any;
      let yearId: any;
      let subjectId: any;
      let courseLeaderId: any;
      let moderatorId: any;
      let finalizerId: any;
      let deanId: any;
      let examinerId: any;
      let teamMemberId: any;
      let unrelatedId: any;
      let adminId: any;
      let printingStaffId: any;
      let assignmentId: any;
      let caseId: any;

      const setupCaseData = async (t: any) => {
        return await t.run(async (ctx: any) => {
          facultyId = await ctx.db.insert("faculties", { name: "FOCS", code: "FOCS", isActive: true });
          yearId = await ctx.db.insert("academicYears", { label: "2025/2026", isActive: true });
          sessionId = await ctx.db.insert("academicSessions", {
            sessionCode: "202601",
            facultyId,
            academicYearId: yearId,
            isActive: true,
          });
          subjectId = await ctx.db.insert("subjects", {
            courseCode: "BACS1014",
            courseTitle: "Intro to Programming",
            facultyId,
            isActive: true,
          });

          courseLeaderId = await ctx.db.insert("users", { normalizedEmail: "cl@tarc.edu.my", isAdmin: false, isPrintingStaff: false, isActive: true });
          moderatorId = await ctx.db.insert("users", { normalizedEmail: "mod@tarc.edu.my", isAdmin: false, isPrintingStaff: false, isActive: true });
          finalizerId = await ctx.db.insert("users", { normalizedEmail: "fin@tarc.edu.my", isAdmin: false, isPrintingStaff: false, isActive: true });
          deanId = await ctx.db.insert("users", { normalizedEmail: "dean@tarc.edu.my", isAdmin: false, isPrintingStaff: false, isActive: true });
          examinerId = await ctx.db.insert("users", { normalizedEmail: "ex@tarc.edu.my", isAdmin: false, isPrintingStaff: false, isActive: true });
          teamMemberId = await ctx.db.insert("users", { normalizedEmail: "tm@tarc.edu.my", isAdmin: false, isPrintingStaff: false, isActive: true });
          unrelatedId = await ctx.db.insert("users", { normalizedEmail: "unrelated@tarc.edu.my", isAdmin: false, isPrintingStaff: false, isActive: true });
          adminId = await ctx.db.insert("users", { normalizedEmail: "admin@tarc.edu.my", isAdmin: true, isPrintingStaff: false, isActive: true });
          printingStaffId = await ctx.db.insert("users", { normalizedEmail: "print@tarc.edu.my", isAdmin: false, isPrintingStaff: true, isActive: true });

          assignmentId = await ctx.db.insert("assignments", {
            academicSessionId: sessionId,
            subjectId,
            examinationType: "main",
            level: "bachelor",
            courseLeaderId,
            moderatorId,
            finalizerId,
            deanId,
            examinerId,
            firstSubmissionDeadline: Date.now() + 86400,
            timezone: "Asia/Kuala_Lumpur",
            isActive: true,
          });

          await ctx.db.insert("assignmentTeamMembers", {
            assignmentId,
            userId: teamMemberId,
          });

          caseId = await ctx.db.insert("moderationCases", {
            assignmentId,
            status: "draft",
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });
      };

      it("denies access to unrelated user", async () => {
        const t = convexTest(schema, modules);
        await setupCaseData(t);
        await expect(
          t.withIdentity({ subject: unrelatedId }).query(api.testHelpers.testRequireCaseAccess, { caseId })
        ).rejects.toThrow(/FORBIDDEN/);
      });

      it("grants access to admin", async () => {
        const t = convexTest(schema, modules);
        await setupCaseData(t);
        const result = await t.withIdentity({ subject: adminId }).query(api.testHelpers.testRequireCaseAccess, { caseId });
        expect(result.caseId).toBe(caseId);
      });

      it("grants access to course leader, moderator, finalizer, dean, examiner", async () => {
        const t = convexTest(schema, modules);
        await setupCaseData(t);
        for (const actorId of [courseLeaderId, moderatorId, finalizerId, deanId, examinerId]) {
          const result = await t.withIdentity({ subject: actorId }).query(api.testHelpers.testRequireCaseAccess, { caseId });
          expect(result.caseId).toBe(caseId);
        }
      });

      it("grants access to team moderator", async () => {
        const t = convexTest(schema, modules);
        await setupCaseData(t);
        const result = await t.withIdentity({ subject: teamMemberId }).query(api.testHelpers.testRequireCaseAccess, { caseId });
        expect(result.caseId).toBe(caseId);
      });

      it("denies printing staff when case is in draft state", async () => {
        const t = convexTest(schema, modules);
        await setupCaseData(t);
        await expect(
          t.withIdentity({ subject: printingStaffId }).query(api.testHelpers.testRequireCaseAccess, { caseId })
        ).rejects.toThrow(/FORBIDDEN/);
      });

      it("grants access to printing staff when case is in printing acknowledgement or closed state", async () => {
        const t = convexTest(schema, modules);
        await setupCaseData(t);

        // Update case to awaiting_printing_acknowledgement
        await t.run(async (ctx) => {
          await ctx.db.patch(caseId, { status: "awaiting_printing_acknowledgement" });
        });

        const result = await t.withIdentity({ subject: printingStaffId }).query(api.testHelpers.testRequireCaseAccess, { caseId });
        expect(result.caseId).toBe(caseId);
      });
    });

    // Actor Role Access Tests
    describe("Case Actor Role Access rules", () => {
      let courseLeaderId: any;
      let moderatorId: any;
      let adminId: any;
      let caseId: any;

      const setupCaseActorData = async (t: any) => {
        return await t.run(async (ctx: any) => {
          const facultyId = await ctx.db.insert("faculties", { name: "FOCS", code: "FOCS", isActive: true });
          const yearId = await ctx.db.insert("academicYears", { label: "2025/2026", isActive: true });
          const sessionId = await ctx.db.insert("academicSessions", {
            sessionCode: "202601",
            facultyId,
            academicYearId: yearId,
            isActive: true,
          });
          const subjectId = await ctx.db.insert("subjects", {
            courseCode: "BACS1014",
            courseTitle: "Intro to Programming",
            facultyId,
            isActive: true,
          });

          courseLeaderId = await ctx.db.insert("users", { normalizedEmail: "cl@tarc.edu.my", isAdmin: false, isPrintingStaff: false, isActive: true });
          moderatorId = await ctx.db.insert("users", { normalizedEmail: "mod@tarc.edu.my", isAdmin: false, isPrintingStaff: false, isActive: true });
          adminId = await ctx.db.insert("users", { normalizedEmail: "admin@tarc.edu.my", isAdmin: true, isPrintingStaff: false, isActive: true });

          const assignmentId = await ctx.db.insert("assignments", {
            academicSessionId: sessionId,
            subjectId,
            examinationType: "main",
            level: "bachelor",
            courseLeaderId,
            moderatorId,
            finalizerId: courseLeaderId, // mock placeholder
            deanId: courseLeaderId, // mock placeholder
            examinerId: courseLeaderId, // mock placeholder
            firstSubmissionDeadline: Date.now() + 86400,
            timezone: "Asia/Kuala_Lumpur",
            isActive: true,
          });

          caseId = await ctx.db.insert("moderationCases", {
            assignmentId,
            status: "draft",
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });
      };

      it("allows assigned actor to act in their role", async () => {
        const t = convexTest(schema, modules);
        await setupCaseActorData(t);
        const result = await t.withIdentity({ subject: courseLeaderId }).query(api.testHelpers.testRequireCaseActor, { caseId, role: "course_leader" });
        expect(result.caseId).toBe(caseId);
      });

      it("denies another active user from acting in a role they are not assigned to", async () => {
        const t = convexTest(schema, modules);
        await setupCaseActorData(t);
        await expect(
          t.withIdentity({ subject: moderatorId }).query(api.testHelpers.testRequireCaseActor, { caseId, role: "course_leader" })
        ).rejects.toThrow(/FORBIDDEN/);
      });

      it("enforces administrator non-impersonation (admin cannot act as course leader unless assigned)", async () => {
        const t = convexTest(schema, modules);
        await setupCaseActorData(t);
        await expect(
          t.withIdentity({ subject: adminId }).query(api.testHelpers.testRequireCaseActor, { caseId, role: "course_leader" })
        ).rejects.toThrow(/FORBIDDEN/);
      });
    });
  });
});
