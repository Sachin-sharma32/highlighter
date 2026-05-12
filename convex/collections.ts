import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { appError } from "./errors";

const NOT_AUTHENTICATED = () =>
  appError(
    "UNAUTHENTICATED",
    "Your session has expired. Please sign in again to continue.",
  );

const COLLECTION_NOT_FOUND = () =>
  appError(
    "NOT_FOUND",
    "That collection no longer exists. Refresh the page and try again.",
  );

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
    if (!userId) throw NOT_AUTHENTICATED();
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
    if (!userId) throw NOT_AUTHENTICATED();
    const col = await ctx.db.get(id);
    if (!col || col.userId !== userId) throw COLLECTION_NOT_FOUND();
    await ctx.db.patch(id, { name: name.trim() });
  },
});

export const remove = mutation({
  args: { id: v.id("collections") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    const col = await ctx.db.get(id);
    if (!col || col.userId !== userId) throw COLLECTION_NOT_FOUND();
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
    const multiCollectionHighlights = await ctx.db
      .query("highlights")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("collectionIds"), undefined))
      .collect();
    for (const h of multiCollectionHighlights) {
      const collectionIds = h.collectionIds?.filter(
        (collectionId) => collectionId !== id,
      );
      if (collectionIds && collectionIds.length !== h.collectionIds?.length) {
        await ctx.db.patch(h._id, { collectionIds });
      }
    }
    await ctx.db.delete(id);
  },
});
