import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

declare const process: { env: Record<string, string | undefined> };

export async function createOrUpdateUser(ctx: any, args: any): Promise<any> {
  const email = args.profile.email;
  if (!email) {
    throw new Error("Email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.endsWith("@tarc.edu.my")) {
    throw new Error("Unauthorized email domain");
  }

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const isBootstrapAdmin = normalizedEmail === bootstrapEmail;

  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_normalizedEmail", (q: any) => q.eq("normalizedEmail", normalizedEmail))
    .unique();

  if (existingUser) {
    const updates: any = {
      name: existingUser.name ?? args.profile.name,
      image: existingUser.image ?? args.profile.image,
      email: existingUser.email ?? email,
      linkedAt: existingUser.linkedAt ?? Date.now(),
    };
    if (isBootstrapAdmin) {
      updates.isAdmin = true;
      updates.isActive = true;
    }
    await ctx.db.patch(existingUser._id, updates);
    return existingUser._id;
  }

  const newUserId = await ctx.db.insert("users", {
    name: args.profile.name,
    image: args.profile.image,
    email: email,
    normalizedEmail,
    isAdmin: isBootstrapAdmin,
    isPrintingStaff: false,
    isActive: isBootstrapAdmin,
    linkedAt: Date.now(),
  });

  return newUserId;
}

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
  callbacks: {
    createOrUpdateUser,
  },
});
