import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertCanCreateHighlight } from "./plan";
import { appError } from "./errors";

const colorValidator = v.string();
const sourceTypeValidator = v.optional(
  v.union(v.literal("web"), v.literal("youtube")),
);

function assertValidClip(args: {
  sourceType?: "web" | "youtube";
  youtubeVideoId?: string;
  clipStart?: number;
  clipEnd?: number;
}) {
  if (args.sourceType !== "youtube") return;
  if (!args.youtubeVideoId?.trim())
    throw appError(
      "INVALID_INPUT",
      "We couldn’t identify the YouTube video for this clip. Please reload the page and try again.",
    );
  if (args.clipStart === undefined || args.clipEnd === undefined) {
    throw appError(
      "INVALID_INPUT",
      "Mark both the start and end of the clip before saving.",
    );
  }
  if (args.clipStart < 0 || args.clipEnd <= args.clipStart) {
    throw appError(
      "INVALID_INPUT",
      "The clip’s end time needs to be after its start time.",
    );
  }
}

const NOT_AUTHENTICATED = () =>
  appError(
    "UNAUTHENTICATED",
    "Your session has expired. Please sign in again to continue.",
  );

const HIGHLIGHT_NOT_FOUND = () =>
  appError(
    "NOT_FOUND",
    "We couldn’t find that highlight — it may have already been deleted.",
  );

export const list = query({
  args: {
    collectionId: v.optional(v.id("collections")),
    filter: v.optional(v.literal("notes")),
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
          q.eq("userId", userId).eq("collectionId", collectionId),
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
          h.tags.some((t) => t.toLowerCase().includes(q)),
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
    anchorPrefix: v.optional(v.string()),
    anchorSuffix: v.optional(v.string()),
    anchorStart: v.optional(v.number()),
    anchorEnd: v.optional(v.number()),
    color: colorValidator,
    note: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    collectionIds: v.optional(v.array(v.id("collections"))),
    tags: v.array(v.string()),
    sourceType: sourceTypeValidator,
    youtubeVideoId: v.optional(v.string()),
    clipStart: v.optional(v.number()),
    clipEnd: v.optional(v.number()),
    youtubeChannelTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    await assertCanCreateHighlight(ctx, userId);
    assertValidClip(args);
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
    collectionIds: v.optional(v.array(v.id("collections"))),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw HIGHLIGHT_NOT_FOUND();
    await ctx.db.patch(id, patch);
  },
});

export const setColor = mutation({
  args: { id: v.id("highlights"), color: colorValidator },
  handler: async (ctx, { id, color }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw HIGHLIGHT_NOT_FOUND();
    await ctx.db.patch(id, { color });
  },
});

export const setNote = mutation({
  args: { id: v.id("highlights"), note: v.string() },
  handler: async (ctx, { id, note }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw HIGHLIGHT_NOT_FOUND();
    await ctx.db.patch(id, { note });
  },
});

export const remove = mutation({
  args: { id: v.id("highlights") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw HIGHLIGHT_NOT_FOUND();
    await ctx.db.delete(id);
  },
});
