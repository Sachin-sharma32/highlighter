import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("collections", {
      userId,
      name: name.trim(),
      createdAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { id: v.id("collections"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const col = await ctx.db.get(id);
    if (!col || col.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { name: name.trim() });
  },
});

export const remove = mutation({
  args: { id: v.id("collections") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const col = await ctx.db.get(id);
    if (!col || col.userId !== userId) throw new Error("Not found");
    // Unlink highlights from this collection
    const highlights = await ctx.db
      .query("highlights")
      .withIndex("by_user_collection", (q) =>
        q.eq("userId", userId).eq("collectionId", id),
      )
      .collect();
    for (const h of highlights) {
      await ctx.db.patch(h._id, { collectionId: undefined });
    }
    await ctx.db.delete(id);
  },
});
