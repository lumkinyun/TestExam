import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { throwError } from "./lib/errors";
import { requireAdmin } from "./lib/authorization";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throwError("UNAUTHENTICATED");
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throwError("UNAUTHENTICATED");
    }
    return user;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").collect();
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    isAdmin: v.optional(v.boolean()),
    isPrintingStaff: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    facultyId: v.optional(v.id("faculties")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
  },
});
