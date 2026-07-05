import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { throwError } from "./errors";

export type CaseActorRole =
  | "course_leader"
  | "moderator"
  | "finalizer"
  | "team_moderator"
  | "dean"
  | "examiner"
  | "printing_staff";

export async function getMaybeUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }
  return await ctx.db.get(userId);
}

export async function requireActiveUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await getMaybeUser(ctx);
  if (!user) {
    throwError("UNAUTHENTICATED");
  }
  if (!user.isActive) {
    throwError("ACCOUNT_DISABLED");
  }
  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await requireActiveUser(ctx);
  if (!user.isAdmin) {
    throwError("FORBIDDEN");
  }
  return user;
}

export async function requireCaseAccess(
  ctx: QueryCtx | MutationCtx,
  caseId: Id<"moderationCases">
): Promise<{ user: Doc<"users">; caseDoc: Doc<"moderationCases">; assignment: Doc<"assignments"> }> {
  const user = await requireActiveUser(ctx);

  const caseDoc = await ctx.db.get(caseId);
  if (!caseDoc) {
    throwError("CASE_NOT_FOUND");
  }

  const assignment = await ctx.db.get(caseDoc.assignmentId);
  if (!assignment) {
    throwError("CASE_NOT_FOUND");
  }

  // Administrators may read every case, revision, comment, form, audit record, and document.
  if (user.isAdmin) {
    return { user, caseDoc, assignment };
  }

  // Assigned participants may read the complete case history necessary to perform their work.
  const isAssigned =
    assignment.courseLeaderId === user._id ||
    assignment.moderatorId === user._id ||
    assignment.finalizerId === user._id ||
    assignment.deanId === user._id ||
    assignment.examinerId === user._id;

  if (isAssigned) {
    return { user, caseDoc, assignment };
  }

  // Check if team member / team moderator
  const teamMember = await ctx.db
    .query("assignmentTeamMembers")
    .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
    .filter((q) => q.eq(q.field("userId"), user._id))
    .unique();

  if (teamMember) {
    return { user, caseDoc, assignment };
  }

  // Check if printing staff and the case is in awaiting_printing_acknowledgement or closed
  if (user.isPrintingStaff && (caseDoc.status === "awaiting_printing_acknowledgement" || caseDoc.status === "closed")) {
    return { user, caseDoc, assignment };
  }

  throwError("FORBIDDEN");
}

export async function requireCaseActor(
  ctx: QueryCtx | MutationCtx,
  caseId: Id<"moderationCases">,
  role: CaseActorRole
): Promise<{ user: Doc<"users">; caseDoc: Doc<"moderationCases">; assignment: Doc<"assignments"> }> {
  const user = await requireActiveUser(ctx);

  const caseDoc = await ctx.db.get(caseId);
  if (!caseDoc) {
    throwError("CASE_NOT_FOUND");
  }

  const assignment = await ctx.db.get(caseDoc.assignmentId);
  if (!assignment) {
    throwError("CASE_NOT_FOUND");
  }

  let hasRole = false;
  switch (role) {
    case "course_leader":
      hasRole = assignment.courseLeaderId === user._id;
      break;
    case "moderator":
      hasRole = assignment.moderatorId === user._id;
      break;
    case "finalizer":
      hasRole = assignment.finalizerId === user._id;
      break;
    case "dean":
      hasRole = assignment.deanId === user._id;
      break;
    case "examiner":
      hasRole = assignment.examinerId === user._id;
      break;
    case "team_moderator":
      const teamMember = await ctx.db
        .query("assignmentTeamMembers")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .unique();
      hasRole = !!teamMember;
      break;
    case "printing_staff":
      hasRole = user.isPrintingStaff;
      break;
    default:
      hasRole = false;
  }

  if (!hasRole) {
    throwError("FORBIDDEN");
  }

  return { user, caseDoc, assignment };
}
