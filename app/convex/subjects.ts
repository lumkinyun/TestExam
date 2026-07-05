import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin, requireActiveUser } from "./lib/authorization";
import { throwError } from "./lib/errors";
import { logAuditEvent } from "./lib/audit";

// Validation: [A-Z]{4}[0-9]{4} — validate AFTER normalization to uppercase
function validateCourseCode(code: string): void {
  if (!/^[A-Z]{4}[0-9]{4}$/.test(code)) {
    throwError("VALIDATION_FAILED", "Course code must be 4 uppercase letters followed by 4 digits (e.g. BTMH3523)");
  }
}

/**
 * Check if a subject is referenced by any case that is beyond draft status.
 * We check assignments linked to this subject, then cases for those assignments.
 */
async function hasSubmittedCase(ctx: any, subjectId: string): Promise<boolean> {
  // Find any assignment for this subject
  const assignments = await ctx.db
    .query("assignments")
    .filter((q: any) => q.eq(q.field("subjectId"), subjectId))
    .collect();

  for (const assignment of assignments) {
    const submittedCase = await ctx.db
      .query("moderationCases")
      .withIndex("by_status_assignment")
      .filter((q: any) => q.and(
        q.eq(q.field("assignmentId"), assignment._id),
        q.neq(q.field("status"), "draft")
      ))
      .first();

    if (submittedCase) return true;
  }

  return false;
}

export const createSubject = mutation({
  args: {
    courseCode: v.string(),
    courseTitle: v.string(),
    facultyId: v.id("faculties"),
  },
  returns: v.id("subjects"),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);

    // Normalize: uppercase + trim
    const courseCode = args.courseCode.trim().toUpperCase();
    const courseTitle = args.courseTitle.trim();

    validateCourseCode(courseCode);

    if (!courseTitle) {
      throwError("VALIDATION_FAILED", "Course title cannot be empty");
    }

    // Duplicate check via index
    const existing = await ctx.db
      .query("subjects")
      .withIndex("by_courseCode", (q) => q.eq("courseCode", courseCode))
      .first();

    if (existing) {
      throwError("VALIDATION_FAILED", "Subject with this course code already exists");
    }

    const id = await ctx.db.insert("subjects", {
      courseCode,
      courseTitle,
      facultyId: args.facultyId,
      isActive: true,
    });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "create",
      targetType: "subjects",
      targetId: id,
      resultingStateSummary: `${courseCode} - ${courseTitle}`,
    });

    return id;
  },
});

export const updateSubject = mutation({
  args: {
    id: v.id("subjects"),
    courseCode: v.string(),
    courseTitle: v.string(),
    facultyId: v.id("faculties"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);

    const courseCode = args.courseCode.trim().toUpperCase();
    const courseTitle = args.courseTitle.trim();

    validateCourseCode(courseCode);

    if (!courseTitle) {
      throwError("VALIDATION_FAILED", "Course title cannot be empty");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throwError("VALIDATION_FAILED", "Subject not found");
    }

    // If courseCode is changing, check for submitted cases (material alteration)
    const isMaterialChange =
      courseCode !== existing.courseCode || courseTitle !== existing.courseTitle;

    if (isMaterialChange) {
      const hasSubmitted = await hasSubmittedCase(ctx, args.id);
      if (hasSubmitted) {
        throwError(
          "ASSIGNMENT_LOCKED",
          "Cannot materially alter a subject that is referenced by a submitted case"
        );
      }
    }

    // Check duplicate code (excluding self)
    if (courseCode !== existing.courseCode) {
      const dup = await ctx.db
        .query("subjects")
        .withIndex("by_courseCode", (q) => q.eq("courseCode", courseCode))
        .filter((q) => q.neq(q.field("_id"), args.id))
        .first();

      if (dup) {
        throwError("VALIDATION_FAILED", "Subject with this course code already exists");
      }
    }

    await ctx.db.patch(args.id, {
      courseCode,
      courseTitle,
      facultyId: args.facultyId,
    });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "update",
      targetType: "subjects",
      targetId: args.id,
      previousStateSummary: `${existing.courseCode} - ${existing.courseTitle}`,
      resultingStateSummary: `${courseCode} - ${courseTitle}`,
    });

    return null;
  },
});

export const deactivateSubject = mutation({
  args: {
    id: v.id("subjects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throwError("VALIDATION_FAILED", "Subject not found");
    }

    await ctx.db.patch(args.id, { isActive: false });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "deactivate",
      targetType: "subjects",
      targetId: args.id,
    });

    return null;
  },
});

export const restoreSubject = mutation({
  args: {
    id: v.id("subjects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throwError("VALIDATION_FAILED", "Subject not found");
    }

    await ctx.db.patch(args.id, { isActive: true });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "restore",
      targetType: "subjects",
      targetId: args.id,
    });

    return null;
  },
});

export const listSubjects = query({
  args: {
    paginationOpts: paginationOptsValidator,
    activeOnly: v.optional(v.boolean()),
    facultyId: v.optional(v.id("faculties")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireActiveUser(ctx);

    const result = await ctx.db
      .query("subjects")
      .order("asc")
      .paginate(args.paginationOpts);

    let page = result.page;

    if (args.activeOnly) {
      page = page.filter((s) => s.isActive);
    }

    if (args.facultyId) {
      page = page.filter((s) => s.facultyId === args.facultyId);
    }

    if (args.search) {
      const search = args.search.trim().toLowerCase();
      if (search) {
        page = page.filter(
          (s) =>
            s.courseCode.toLowerCase().includes(search) ||
            s.courseTitle.toLowerCase().includes(search)
        );
      }
    }

    return { ...result, page };
  },
});

export const getSubject = query({
  args: {
    id: v.id("subjects"),
  },
  handler: async (ctx, args) => {
    await requireActiveUser(ctx);
    return ctx.db.get(args.id);
  },
});
