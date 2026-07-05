import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function logAuditEvent(
  ctx: MutationCtx,
  args: {
    actorId: Id<"users">;
    action: string;
    targetType: string;
    targetId: string;
    caseId?: Id<"moderationCases">;
    previousStateSummary?: string;
    resultingStateSummary?: string;
    reason?: string;
  }
) {
  return await ctx.db.insert("auditLogs", {
    ...args,
    timestamp: Date.now(),
  });
}
