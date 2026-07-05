import { v } from "convex/values";

export const caseStatusValidator = v.union(
  v.literal("draft"),
  v.literal("awaiting_moderator"),
  v.literal("returned_by_moderator"),
  v.literal("awaiting_finalizer"),
  v.literal("returned_by_finalizer"),
  v.literal("awaiting_team"),
  v.literal("returned_by_team"),
  v.literal("awaiting_dean"),
  v.literal("returned_by_dean"),
  v.literal("awaiting_examiner_confirmation"),
  v.literal("awaiting_deca_confirmation"),
  v.literal("awaiting_printing_acknowledgement"),
  v.literal("closed")
);

export const documentKindValidator = v.union(
  v.literal("question_paper"),
  v.literal("marking_scheme")
);

export const decisionValidator = v.union(
  v.literal("proceed"),
  v.literal("return")
);

export const caseActorRoleValidator = v.union(
  v.literal("course_leader"),
  v.literal("moderator"),
  v.literal("finalizer"),
  v.literal("team_moderator"),
  v.literal("dean"),
  v.literal("examiner"),
  v.literal("printing_staff")
);
