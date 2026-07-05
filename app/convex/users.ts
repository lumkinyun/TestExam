import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { throwError } from "./lib/errors";
import { requireAdmin } from "./lib/authorization";

export const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  normalizedEmail: v.string(),
  isAdmin: v.boolean(),
  isPrintingStaff: v.boolean(),
  isActive: v.boolean(),
  facultyId: v.optional(v.id("faculties")),
  linkedAt: v.optional(v.number()),
});

export const current = query({
  args: {},
  returns: userValidator,
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
  returns: v.array(userValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").take(100);
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
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
    return null;
  },
});
