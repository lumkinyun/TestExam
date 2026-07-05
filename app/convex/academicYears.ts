import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin, requireActiveUser } from "./lib/authorization";
import { throwError } from "./lib/errors";
import { logAuditEvent } from "./lib/audit";

// Validation: YYYY/YYYY where second = first + 1
function validateAcademicYearLabel(label: string): void {
  const trimmed = label.trim();
  const match = trimmed.match(/^(\d{4})\/(\d{4})$/);
  if (!match) {
    throwError("VALIDATION_FAILED", "Academic year must be in YYYY/YYYY format");
  }
  const first = parseInt(match[1], 10);
  const second = parseInt(match[2], 10);
  if (second !== first + 1) {
    throwError("VALIDATION_FAILED", "Second year must be exactly one more than the first");
  }
}

export const createAcademicYear = mutation({
  args: {
    label: v.string(),
  },
  returns: v.id("academicYears"),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const label = args.label.trim();

    validateAcademicYearLabel(label);

    // Duplicate check
    const existing = await ctx.db
      .query("academicYears")
      .filter((q) => q.eq(q.field("label"), label))
      .first();

    if (existing) {
      throwError("VALIDATION_FAILED", "Academic year already exists");
    }

    const id = await ctx.db.insert("academicYears", {
      label,
      isActive: true,
    });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "create",
      targetType: "academicYears",
      targetId: id,
      resultingStateSummary: label,
    });

    return id;
  },
});

export const updateAcademicYear = mutation({
  args: {
    id: v.id("academicYears"),
    label: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const label = args.label.trim();

    validateAcademicYearLabel(label);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throwError("VALIDATION_FAILED", "Academic year not found");
    }

    // Check duplicate (excluding self)
    const dup = await ctx.db
      .query("academicYears")
      .filter((q) => q.and(q.eq(q.field("label"), label), q.neq(q.field("_id"), args.id)))
      .first();

    if (dup) {
      throwError("VALIDATION_FAILED", "Academic year label already in use");
    }

    await ctx.db.patch(args.id, { label });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "update",
      targetType: "academicYears",
      targetId: args.id,
      previousStateSummary: existing.label,
      resultingStateSummary: label,
    });

    return null;
  },
});

export const deactivateAcademicYear = mutation({
  args: {
    id: v.id("academicYears"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throwError("VALIDATION_FAILED", "Academic year not found");
    }

    await ctx.db.patch(args.id, { isActive: false });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "deactivate",
      targetType: "academicYears",
      targetId: args.id,
    });

    return null;
  },
});

export const restoreAcademicYear = mutation({
  args: {
    id: v.id("academicYears"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throwError("VALIDATION_FAILED", "Academic year not found");
    }

    await ctx.db.patch(args.id, { isActive: true });

    await logAuditEvent(ctx, {
      actorId: actor._id,
      action: "restore",
      targetType: "academicYears",
      targetId: args.id,
    });

    return null;
  },
});

export const listAcademicYears = query({
  args: {
    paginationOpts: paginationOptsValidator,
    activeOnly: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireActiveUser(ctx);

    let queryBuilder = ctx.db.query("academicYears").order("desc");

    const result = await queryBuilder.paginate(args.paginationOpts);

    let page = result.page;

    // Filter active only
    if (args.activeOnly) {
      page = page.filter((y) => y.isActive);
    }

    // Client-side search on label
    if (args.search) {
      const search = args.search.trim().toLowerCase();
      if (search) {
        page = page.filter((y) => y.label.toLowerCase().includes(search));
      }
    }

    return { ...result, page };
  },
});

export const getAcademicYear = query({
  args: {
    id: v.id("academicYears"),
  },
  returns: v.union(
    v.object({
      _id: v.id("academicYears"),
      _creationTime: v.number(),
      label: v.string(),
      isActive: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireActiveUser(ctx);
    return ctx.db.get(args.id);
  },
});
