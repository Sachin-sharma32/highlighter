import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const colorValidator = v.union(
  v.literal("amber"),
  v.literal("rose"),
  v.literal("sage"),
  v.literal("sky"),
  v.literal("violet")
);

async function userIdFromToken(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Id<"users"> | null> {
  const session = await ctx.db
    .query("extensionSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  return session?.userId ?? null;
}

export const listByUrl = query({
  args: { token: v.string(), url: v.string() },
  handler: async (ctx, { token, url }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) return [];
    return await ctx.db
      .query("highlights")
      .withIndex("by_user_url", (q) => q.eq("userId", userId).eq("url", url))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) return [];
    return await ctx.db
      .query("highlights")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    url: v.string(),
    title: v.string(),
    author: v.optional(v.string()),
    text: v.string(),
    textContext: v.optional(v.string()),
    anchorPrefix: v.optional(v.string()),
    anchorSuffix: v.optional(v.string()),
    anchorStart: v.optional(v.number()),
    anchorEnd: v.optional(v.number()),
    color: colorValidator,
  },
  handler: async (ctx, { token, ...data }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) throw new Error("Invalid extension session");
    return await ctx.db.insert("highlights", {
      ...data,
      userId,
      tags: [],
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("highlights"),
    color: v.optional(colorValidator),
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { token, id, ...patch }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) throw new Error("Invalid extension session");
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("highlights") },
  handler: async (ctx, { token, id }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) throw new Error("Invalid extension session");
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("extensionSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});
