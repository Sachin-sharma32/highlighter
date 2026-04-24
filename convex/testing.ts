import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { createAccount, retrieveAccount } from "@convex-dev/auth/server";

const isProduction =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV ===
  "production";

function assertTestMode() {
  if (isProduction) {
    throw new Error("Testing helpers are disabled in production");
  }
}

async function getOrCreatePlaywrightUser(ctx: any, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await retrieveAccount(ctx, {
    provider: "playwright",
    account: { id: normalizedEmail },
  });
  if (existing) {
    return existing.user;
  }

  const { user } = await createAccount(ctx, {
    provider: "playwright",
    account: { id: normalizedEmail },
    profile: {
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0],
    } as any,
  });
  return user;
}

export const resetUserData = mutation({
  args: { email: v.string() },
  handler: async (ctx: any, { email }: { email: string }) => {
    assertTestMode();

    const existing = await retrieveAccount(ctx, {
      provider: "playwright",
      account: { id: email.trim().toLowerCase() },
    });
    if (!existing) {
      return { ok: true };
    }

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_user", (q: any) => q.eq("userId", existing.user._id))
      .collect();
    for (const collection of collections) {
      await ctx.db.delete(collection._id);
    }

    const highlights = await ctx.db
      .query("highlights")
      .withIndex("by_user", (q: any) => q.eq("userId", existing.user._id))
      .collect();
    for (const highlight of highlights) {
      await ctx.db.delete(highlight._id);
    }

    return { ok: true };
  },
});

export const seedHighlight = mutation({
  args: {
    email: v.string(),
    url: v.string(),
    title: v.string(),
    text: v.string(),
    color: v.optional(
      v.union(
        v.literal("amber"),
        v.literal("rose"),
        v.literal("sage"),
        v.literal("sky"),
        v.literal("violet")
      )
    ),
    note: v.optional(v.string()),
  },
  handler: async (
    ctx: any,
    args: {
      email: string;
      url: string;
      title: string;
      text: string;
      color?: "amber" | "rose" | "sage" | "sky" | "violet";
      note?: string;
    }
  ) => {
    assertTestMode();
    const user = await getOrCreatePlaywrightUser(ctx, args.email);
    return await ctx.db.insert("highlights", {
      userId: user._id,
      url: args.url,
      title: args.title,
      text: args.text,
      color: args.color ?? "amber",
      note: args.note,
      tags: [],
      createdAt: Date.now(),
    });
  },
});