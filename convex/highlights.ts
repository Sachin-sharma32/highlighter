import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const colorValidator = v.union(
  v.literal("amber"),
  v.literal("rose"),
  v.literal("sage"),
  v.literal("sky"),
  v.literal("violet")
);

export const list = query({
  args: {
    collectionId: v.optional(v.id("collections")),
    filter: v.optional(v.union(v.literal("notes"), v.literal("review"))),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { collectionId, filter, search }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let rows;
    if (collectionId) {
      rows = await ctx.db
        .query("highlights")
        .withIndex("by_user_collection", (q) =>
          q.eq("userId", userId).eq("collectionId", collectionId)
        )
        .order("desc")
        .collect();
    } else {
      rows = await ctx.db
        .query("highlights")
        .withIndex("by_user_createdAt", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }

    if (filter === "notes") {
      rows = rows.filter((h) => h.note && h.note.trim().length > 0);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (h) =>
          h.text.toLowerCase().includes(q) ||
          h.title.toLowerCase().includes(q) ||
          (h.note && h.note.toLowerCase().includes(q)) ||
          h.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return rows;
  },
});

export const byUrl = query({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("highlights")
      .withIndex("by_user_url", (q) => q.eq("userId", userId).eq("url", url))
      .order("desc")
      .collect();
  },
});

export const byId = query({
  args: { id: v.id("highlights") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) return null;
    return h;
  },
});

export const allTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("highlights")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const counts: Record<string, number> = {};
    for (const h of rows) {
      for (const tag of h.tags) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  },
});

export const create = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    author: v.optional(v.string()),
    text: v.string(),
    textContext: v.optional(v.string()),
    color: colorValidator,
    note: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("highlights", {
      ...args,
      userId,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("highlights"),
    color: v.optional(colorValidator),
    note: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, patch);
  },
});

export const setColor = mutation({
  args: { id: v.id("highlights"), color: colorValidator },
  handler: async (ctx, { id, color }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { color });
  },
});

export const setNote = mutation({
  args: { id: v.id("highlights"), note: v.string() },
  handler: async (ctx, { id, note }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { note });
  },
});

export const remove = mutation({
  args: { id: v.id("highlights") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});
