import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  assertCanCreateHighlight,
  getUserPlan,
  getHighlightCount,
  FREE_HIGHLIGHT_LIMIT,
} from "./plan";
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

const INVALID_SESSION = () =>
  appError(
    "INVALID_EXTENSION_SESSION",
    "Your extension session is no longer valid. Please reconnect from the extension popup.",
  );

const HIGHLIGHT_NOT_FOUND = () =>
  appError(
    "NOT_FOUND",
    "We couldn’t find that highlight — it may have already been deleted.",
  );

const COLLECTION_NOT_FOUND = () =>
  appError(
    "NOT_FOUND",
    "That collection no longer exists. Refresh the dashboard and try again.",
  );

async function userIdFromToken(
  ctx: QueryCtx | MutationCtx,
  token: string,
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

export const listCollections = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) return [];
    return await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

export const getColors = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) return null;
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings?.highlightColors ?? null;
  },
});

export const createCollection = mutation({
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, { token, name }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) throw INVALID_SESSION();
    return await ctx.db.insert("collections", {
      userId,
      name: name.trim(),
      createdAt: Date.now(),
    });
  },
});

export const usage = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId)
      return { plan: "free" as const, count: 0, limit: FREE_HIGHLIGHT_LIMIT };
    const plan = await getUserPlan(ctx, userId);
    const count = await getHighlightCount(ctx, userId);
    return { plan, count, limit: FREE_HIGHLIGHT_LIMIT };
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
    note: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    collectionIds: v.optional(v.array(v.id("collections"))),
    tags: v.optional(v.array(v.string())),
    sourceType: sourceTypeValidator,
    youtubeVideoId: v.optional(v.string()),
    clipStart: v.optional(v.number()),
    clipEnd: v.optional(v.number()),
    youtubeChannelTitle: v.optional(v.string()),
  },
  handler: async (ctx, { token, tags, collectionId, ...data }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) throw INVALID_SESSION();
    await assertCanCreateHighlight(ctx, userId);
    assertValidClip(data);
    if (collectionId) {
      const col = await ctx.db.get(collectionId);
      if (!col || col.userId !== userId) {
        throw COLLECTION_NOT_FOUND();
      }
    }
    return await ctx.db.insert("highlights", {
      ...data,
      userId,
      tags: tags ?? [],
      collectionId,
      collectionIds: data.collectionIds,
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
    collectionId: v.optional(v.union(v.id("collections"), v.null())),
    collectionIds: v.optional(v.array(v.id("collections"))),
  },
  handler: async (
    ctx,
    { token, id, collectionId, collectionIds, ...patch },
  ) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) throw INVALID_SESSION();
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw HIGHLIGHT_NOT_FOUND();
    if (collectionId) {
      const col = await ctx.db.get(collectionId);
      if (!col || col.userId !== userId) throw COLLECTION_NOT_FOUND();
    }
    const finalPatch: Record<string, unknown> = { ...patch };
    if (collectionId === null) {
      finalPatch.collectionId = undefined;
    } else if (collectionId !== undefined) {
      finalPatch.collectionId = collectionId;
    }
    if (collectionIds !== undefined) {
      finalPatch.collectionIds = collectionIds;
    }
    await ctx.db.patch(id, finalPatch);
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("highlights") },
  handler: async (ctx, { token, id }) => {
    const userId = await userIdFromToken(ctx, token);
    if (!userId) throw INVALID_SESSION();
    const h = await ctx.db.get(id);
    if (!h || h.userId !== userId) throw HIGHLIGHT_NOT_FOUND();
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
