import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import {
  caseStatusValidator,
  documentKindValidator,
  decisionValidator,
  caseActorRoleValidator,
} from "./lib/validators";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),

    // Application fields
    normalizedEmail: v.string(),
    isAdmin: v.boolean(),
    isPrintingStaff: v.boolean(),
    isActive: v.boolean(),
    facultyId: v.optional(v.id("faculties")),
    linkedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_normalizedEmail", ["normalizedEmail"]),

  faculties: defineTable({
    name: v.string(),
    code: v.string(),
    isActive: v.boolean(),
  }),

  academicYears: defineTable({
    label: v.string(), // YYYY/YYYY
    isActive: v.boolean(),
  }),

  academicSessions: defineTable({
    sessionCode: v.string(), // 6 digits ending in 01|05|09
    facultyId: v.id("faculties"),
    academicYearId: v.id("academicYears"),
    defaultDeadline: v.optional(v.number()), // default submission deadline
    isActive: v.boolean(),
  })
    .index("by_faculty_year_session", ["facultyId", "academicYearId", "sessionCode"]),

  subjects: defineTable({
    courseCode: v.string(), // 4 letters + 4 digits
    courseTitle: v.string(),
    facultyId: v.id("faculties"),
    isActive: v.boolean(),
  })
    .index("by_courseCode", ["courseCode"]),

  assignments: defineTable({
    academicSessionId: v.id("academicSessions"),
    subjectId: v.id("subjects"),
    examinationType: v.union(v.literal("main"), v.literal("resit"), v.literal("repeat")),
    level: v.union(v.literal("bachelor"), v.literal("diploma")),
    courseLeaderId: v.id("users"),
    moderatorId: v.id("users"),
    finalizerId: v.id("users"),
    deanId: v.id("users"),
    examinerId: v.id("users"),
    firstSubmissionDeadline: v.number(), // UTC Timestamp
    timezone: v.string(),
    isActive: v.boolean(),
  })
    .index("by_uniqueness", ["academicSessionId", "subjectId", "examinationType"]),

  assignmentTeamMembers: defineTable({
    assignmentId: v.id("assignments"),
    userId: v.id("users"),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_user", ["userId"])
    .index("by_assignment_user", ["assignmentId", "userId"]),

  moderationCases: defineTable({
    assignmentId: v.id("assignments"),
    status: caseStatusValidator,
    currentRevisionNumber: v.optional(v.number()),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    closedAt: v.optional(v.number()),
    isPurgeEligible: v.optional(v.boolean()),
  })
    .index("by_status_assignment", ["status", "assignmentId"]),

  caseDrafts: defineTable({
    caseId: v.id("moderationCases"),
    questionPaperFileId: v.optional(v.id("revisionFiles")),
    markingSchemeFileId: v.optional(v.id("revisionFiles")),
    questionCoverValues: v.optional(v.string()), // JSON string representation
    markingCoverValues: v.optional(v.string()), // JSON string representation
    cobeUrl: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_case", ["caseId"]),

  submissionRevisions: defineTable({
    caseId: v.id("moderationCases"),
    revisionNumber: v.number(),
    submittedAt: v.number(),
    courseLeaderId: v.id("users"),
    statusAtSubmission: caseStatusValidator,
    questionPaperFileId: v.id("revisionFiles"),
    markingSchemeFileId: v.id("revisionFiles"),
    questionCoverSnapshotId: v.id("questionCoverSnapshots"),
    markingCoverSnapshotId: v.id("markingCoverSnapshots"),
    cobeUrl: v.string(),
    changedFieldsSummary: v.string(),
  })
    .index("by_case_number", ["caseId", "revisionNumber"]),

  revisionFiles: defineTable({
    caseId: v.id("moderationCases"),
    kind: documentKindValidator,
    r2Key: v.string(),
    sha256: v.string(),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    lifecycleState: v.union(
      v.literal("quarantined"),
      v.literal("validated"),
      v.literal("permanent"),
      v.literal("orphaned"),
      v.literal("purge_eligible")
    ),
  })
    .index("by_case_state", ["caseId", "lifecycleState"]),

  fileUploadTickets: defineTable({
    caseId: v.id("moderationCases"),
    kind: documentKindValidator,
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    r2Key: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  }),

  questionCoverSnapshots: defineTable({
    academicYear: v.string(),
    session: v.string(),
    level: v.string(),
    courseCode: v.string(),
    courseTitle: v.string(),
    courseLeaderName: v.string(),
    examinerNames: v.array(v.string()),
    specialInstructionsIncluded: v.boolean(),
    questionsSubmittedCount: v.number(),
    attachments: v.array(
      v.object({
        description: v.string(),
        pageCount: v.number(),
      })
    ),
    totalAttachmentPages: v.number(),
    signatoryName: v.string(),
    signatoryTimestamp: v.number(),
  }),

  markingCoverSnapshots: defineTable({
    academicYear: v.string(),
    session: v.string(),
    level: v.string(),
    courseCode: v.string(),
    courseTitle: v.string(),
    courseLeaderName: v.string(),
    examinerNames: v.array(v.string()),
    modelAnswersCount: v.number(),
    markAllocationsIndicated: v.boolean(),
    signatoryName: v.string(),
    signatoryTimestamp: v.number(),
  }),

  stageDecisions: defineTable({
    caseId: v.id("moderationCases"),
    actorId: v.id("users"),
    role: caseActorRoleValidator,
    decision: decisionValidator,
    comment: v.optional(v.string()),
    revisionNumber: v.number(),
    createdAt: v.number(),
  })
    .index("by_case_creation", ["caseId", "createdAt"]),

  teamReviewRounds: defineTable({
    caseId: v.id("moderationCases"),
    revisionNumber: v.number(),
    roundNumber: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
  })
    .index("by_case", ["caseId"])
    .index("by_case_revision", ["caseId", "revisionNumber"]),

  teamMemberDecisions: defineTable({
    roundId: v.id("teamReviewRounds"),
    memberId: v.id("users"),
    decision: decisionValidator,
    comment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_round_member", ["roundId", "memberId"]),

  printingConfirmations: defineTable({
    caseId: v.id("moderationCases"),
    version: v.number(),
    checklistResponses: v.array(v.boolean()),
    examinerName: v.optional(v.string()),
    examinerSignatureDate: v.optional(v.number()),
    a4Attachment: v.object({
      exists: v.boolean(),
      details: v.optional(v.string()),
      pageCount: v.optional(v.number()),
    }),
    a3Attachment: v.object({
      exists: v.boolean(),
      details: v.optional(v.string()),
      pageCount: v.optional(v.number()),
    }),
    decaOfficerName: v.optional(v.string()),
    decaFirstSubmissionAcceptable: v.optional(v.boolean()),
    decaFirstSubmissionRemarks: v.optional(v.string()),
    decaRev1Acceptable: v.optional(v.boolean()),
    decaRev1Remarks: v.optional(v.string()),
    decaRev2Acceptable: v.optional(v.boolean()),
    decaRev2Remarks: v.optional(v.string()),
    decaConfirmedDate: v.optional(v.number()),
    printingRecipientName: v.optional(v.string()),
    printingReceivedDate: v.optional(v.number()),
  })
    .index("by_case", ["caseId"]),

  deadlineReopenings: defineTable({
    assignmentId: v.id("assignments"),
    adminId: v.id("users"),
    previousDeadline: v.number(),
    newDeadline: v.number(),
    reason: v.string(),
    timestamp: v.number(),
  })
    .index("by_assignment", ["assignmentId"]),

  gmailConnections: defineTable({
    facultyId: v.id("faculties"),
    emailAddress: v.string(),
    encryptedTokens: v.string(),
    iv: v.string(),
    tag: v.string(),
    connectedBy: v.id("users"),
    connectedAt: v.number(),
    lastSuccessAt: v.optional(v.number()),
    lastFailureAt: v.optional(v.number()),
    lastFailureReason: v.optional(v.string()),
  })
    .index("by_faculty", ["facultyId"]),

  gmailOAuthStates: defineTable({
    state: v.string(),
    adminId: v.id("users"),
    facultyId: v.id("faculties"),
    expiresAt: v.number(),
  })
    .index("by_state", ["state"]),

  emailJobs: defineTable({
    idempotencyKey: v.string(),
    caseId: v.id("moderationCases"),
    eventType: v.string(),
    recipientEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    status: v.union(v.literal("pending"), v.literal("delivered"), v.literal("failed")),
    attemptsCount: v.number(),
    scheduledAt: v.number(),
    lastAttemptAt: v.optional(v.number()),
    providerMessageId: v.optional(v.string()),
  })
    .index("by_idempotency", ["idempotencyKey"])
    .index("by_status_schedule", ["status", "scheduledAt"]),

  emailAttempts: defineTable({
    emailJobId: v.id("emailJobs"),
    attemptedAt: v.number(),
    status: v.union(v.literal("success"), v.literal("retryable_failure"), v.literal("terminal_failure")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_emailJob", ["emailJobId"]),

  importJobs: defineTable({
    fileName: v.string(),
    fileSize: v.number(),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("validated"), v.literal("committed"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
  }),

  importRows: defineTable({
    jobId: v.id("importJobs"),
    rowNumber: v.number(),
    kind: v.union(v.literal("create"), v.literal("update"), v.literal("conflict")),
    errors: v.array(v.string()),
    normalizedRowJson: v.optional(v.string()),
  })
    .index("by_job", ["jobId"]),

  auditLogs: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    caseId: v.optional(v.id("moderationCases")),
    previousStateSummary: v.optional(v.string()),
    resultingStateSummary: v.optional(v.string()),
    timestamp: v.number(),
    reason: v.optional(v.string()),
  })
    .index("by_target", ["targetType", "targetId"])
    .index("by_case", ["caseId"]),

  fileAccessLogs: defineTable({
    userId: v.id("users"),
    caseId: v.id("moderationCases"),
    revisionNumber: v.optional(v.number()),
    fileId: v.optional(v.id("revisionFiles")),
    action: v.union(v.literal("preview"), v.literal("download"), v.literal("print")),
    timestamp: v.number(),
  })
    .index("by_case", ["caseId"]),

  caseStageCounters: defineTable({
    facultyId: v.id("faculties"),
    academicYearId: v.id("academicYears"),
    academicSessionId: v.id("academicSessions"),
    status: caseStatusValidator,
    count: v.number(),
  })
    .index("by_faculty_year_session_status", ["facultyId", "academicYearId", "academicSessionId", "status"]),
});
