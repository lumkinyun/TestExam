import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireActiveUser,
  requireAdmin,
  requireCaseAccess,
  requireCaseActor,
} from "./lib/authorization";
import type { CaseActorRole } from "./lib/authorization";

export const testRequireActiveUser = query({
  args: {},
  handler: async (ctx) => {
    return await requireActiveUser(ctx);
  },
});

export const testRequireAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await requireAdmin(ctx);
  },
});

export const testRequireCaseAccess = query({
  args: { caseId: v.id("moderationCases") },
  handler: async (ctx, args) => {
    const result = await requireCaseAccess(ctx, args.caseId);
    return {
      userId: result.user._id,
      caseId: result.caseDoc._id,
      assignmentId: result.assignment._id,
    };
  },
});

export const testRequireCaseActor = query({
  args: {
    caseId: v.id("moderationCases"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await requireCaseActor(ctx, args.caseId, args.role as CaseActorRole);
    return {
      userId: result.user._id,
      caseId: result.caseDoc._id,
      assignmentId: result.assignment._id,
    };
  },
});
