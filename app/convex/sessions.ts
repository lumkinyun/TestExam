import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin, requireActiveUser } from "./lib/authorization";
import { throwError } from "./lib/errors";
import { logAuditEvent } from "./lib/audit";

// Validation: 6 digits ending in 01, 05, or 09
function validateSessionCode(code: string): void {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    throwError("VALIDATION_FAILED", "Session code must be exactly 6 digits");
  }
  if (!/(01|05|09)$/.test(trimmed)) {
    throwError("VALIDATION_FAILED", "Session code must end in 01, 05, or 09");
  }
}

export const createSession = mutation({
  args: {
    sessionCode: v.string(),
    facultyId: v.id("faculties"),
    academicYearId: v.id("academicYears"),
    defaultDeadline: v.optional(v.number()),
  },
  returns: v.id("academicSessions"),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const sessionCode = args.sessionCode.trim();

    validateSessionCode(sessionCode);

    // Duplicate check via index
    const existing = await ctx.db
      .query("academicSessions")
      .withIndex("by_faculty_year_session", (q) =>
        q
          .eq("facultyId", args.facultyId)
          .eq("academicYearId", args.academicYearId)
          .eq("sessionCode", sessionCode)
      )
      .first();

    if (existing) {
      throwError("VALIDATION_FAILED", "Session already exists for this faculty and academic year");
    }

    const id = await ctx.db.insert("academicSessions", {
      sessionCode,
      facultyId: args.facultyId,
      academicYearId: args.academicYearId,
      defaultDeadline: args.defaultDeadline,
      isActive: true,
    });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "create",
      targetType: "academicSessions",
      targetId: id,
      resultingStateSummary: sessionCode,
    });

    return id;
  },
});

export const updateSession = mutation({
  args: {
    id: v.id("academicSessions"),
    sessionCode: v.string(),
    facultyId: v.id("faculties"),
    academicYearId: v.id("academicYears"),
    defaultDeadline: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const sessionCode = args.sessionCode.trim();

    validateSessionCode(sessionCode);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throwError("VALIDATION_FAILED", "Session not found");
    }

    // Check duplicate excluding self
    const dup = await ctx.db
      .query("academicSessions")
      .withIndex("by_faculty_year_session", (q) =>
        q
          .eq("facultyId", args.facultyId)
          .eq("academicYearId", args.academicYearId)
          .eq("sessionCode", sessionCode)
      )
      .filter((q) => q.neq(q.field("_id"), args.id))
      .first();

    if (dup) {
      throwError("VALIDATION_FAILED", "Session code already in use");
    }

    await ctx.db.patch(args.id, {
      sessionCode,
      facultyId: args.facultyId,
      academicYearId: args.academicYearId,
      defaultDeadline: args.defaultDeadline,
    });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "update",
      targetType: "academicSessions",
      targetId: args.id,
      previousStateSummary: existing.sessionCode,
      resultingStateSummary: sessionCode,
    });

    return null;
  },
});

export const deactivateSession = mutation({
  args: {
    id: v.id("academicSessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throwError("VALIDATION_FAILED", "Session not found");
    }

    await ctx.db.patch(args.id, { isActive: false });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "deactivate",
      targetType: "academicSessions",
      targetId: args.id,
    });

    return null;
  },
});

export const restoreSession = mutation({
  args: {
    id: v.id("academicSessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throwError("VALIDATION_FAILED", "Session not found");
    }

    await ctx.db.patch(args.id, { isActive: true });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "restore",
      targetType: "academicSessions",
      targetId: args.id,
    });

    return null;
  },
});

export const listSessions = query({
  args: {
    paginationOpts: paginationOptsValidator,
    activeOnly: v.optional(v.boolean()),
    facultyId: v.optional(v.id("faculties")),
    academicYearId: v.optional(v.id("academicYears")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireActiveUser(ctx);

    const result = await ctx.db
      .query("academicSessions")
      .order("desc")
      .paginate(args.paginationOpts);

    let page = result.page;

    if (args.activeOnly) {
      page = page.filter((s) => s.isActive);
    }

    if (args.facultyId) {
      page = page.filter((s) => s.facultyId === args.facultyId);
    }

    if (args.academicYearId) {
      page = page.filter((s) => s.academicYearId === args.academicYearId);
    }

    if (args.search) {
      const search = args.search.trim().toLowerCase();
      if (search) {
        page = page.filter((s) => s.sessionCode.toLowerCase().includes(search));
      }
    }

    return { ...result, page };
  },
});

export const getSession = query({
  args: {
    id: v.id("academicSessions"),
  },
  handler: async (ctx, args) => {
    await requireActiveUser(ctx);
    return ctx.db.get(args.id);
  },
});
