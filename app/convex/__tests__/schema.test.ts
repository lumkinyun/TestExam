/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

describe("schema", () => {
  it("initializes with auth and domain tables", async () => {
    const t = convexTest(schema, modules);
    expect(t).toBeDefined();
    
    // Assert all tables are defined in the schema
    const expectedTables = [
      "users",
      "faculties",
      "academicYears",
      "academicSessions",
      "subjects",
      "assignments",
      "assignmentTeamMembers",
      "moderationCases",
      "caseDrafts",
      "submissionRevisions",
      "revisionFiles",
      "fileUploadTickets",
      "questionCoverSnapshots",
      "markingCoverSnapshots",
      "stageDecisions",
      "teamReviewRounds",
      "teamMemberDecisions",
      "printingConfirmations",
      "deadlineReopenings",
      "gmailConnections",
      "gmailOAuthStates",
      "emailJobs",
      "emailAttempts",
      "importJobs",
      "importRows",
      "auditLogs",
      "fileAccessLogs",
      "caseStageCounters"
    ];
    for (const tableName of expectedTables) {
      expect(schema.tables[tableName]).toBeDefined();
    }
  });
});
