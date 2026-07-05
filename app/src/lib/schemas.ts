import { z } from "zod";

export const CASE_STATUSES = [
  "draft", "awaiting_moderator", "returned_by_moderator",
  "awaiting_finalizer", "returned_by_finalizer", "awaiting_team",
  "returned_by_team", "awaiting_dean", "returned_by_dean",
  "awaiting_examiner_confirmation", "awaiting_deca_confirmation",
  "awaiting_printing_acknowledgement", "closed",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
export const caseStatusSchema = z.enum(CASE_STATUSES);

export const DOCUMENT_KINDS = ["question_paper", "marking_scheme"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export const documentKindSchema = z.enum(DOCUMENT_KINDS);

export const DECISIONS = ["proceed", "return"] as const;
export type Decision = (typeof DECISIONS)[number];
export const decisionSchema = z.enum(DECISIONS);

export const CASE_ACTOR_ROLES = [
  "course_leader", "moderator", "finalizer", "team_moderator",
  "dean", "examiner", "printing_staff",
] as const;
export type CaseActorRole = (typeof CASE_ACTOR_ROLES)[number];
export const caseActorRoleSchema = z.enum(CASE_ACTOR_ROLES);
