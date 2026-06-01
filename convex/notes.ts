import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { appError } from "./errors";
import { assertCanCreateNote } from "./plan";

const NOT_AUTHENTICATED = () =>
  appError(
    "UNAUTHENTICATED",
    "Your session has expired. Please sign in again to continue.",
  );

const NOTE_NOT_FOUND = () =>
  appError(
    "NOT_FOUND",
    "That note no longer exists. Refresh the page and try again.",
  );

export const list = query({
  args: {
    search: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
  },
  handler: async (ctx, { search, collectionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let notes;
    if (collectionId) {
      notes = await ctx.db
        .query("notes")
        .withIndex("by_user_collection", (q) =>
          q.eq("userId", userId).eq("collectionId", collectionId),
        )
        .collect();
      notes.sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      notes = await ctx.db
        .query("notes")
        .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }
    if (!search) return notes;
    const needle = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(needle) ||
        n.content.toLowerCase().includes(needle),
    );
  },
});

export const byId = query({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const note = await ctx.db.get(id);
    if (!note || note.userId !== userId) return null;
    return note;
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.union(v.literal("note"), v.literal("whiteboard"))),
    collectionId: v.optional(v.id("collections")),
  },
  handler: async (ctx, { title, content, type, collectionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    const noteType = type ?? "note";
    await assertCanCreateNote(ctx, userId, noteType);
    if (collectionId) {
      const collection = await ctx.db.get(collectionId);
      if (!collection || collection.userId !== userId) {
        throw appError(
          "NOT_FOUND",
          "That collection no longer exists. Refresh the page and try again.",
        );
      }
    }
    const now = Date.now();
    const fallbackTitle =
      noteType === "whiteboard" ? "Untitled whiteboard" : "Untitled note";
    return await ctx.db.insert("notes", {
      userId,
      title: title?.trim() || fallbackTitle,
      content: content ?? "",
      type: noteType,
      collectionId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, { id, title, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    const note = await ctx.db.get(id);
    if (!note || note.userId !== userId) throw NOTE_NOT_FOUND();
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (title !== undefined) patch.title = title;
    if (content !== undefined) patch.content = content;
    await ctx.db.patch(id, patch);
  },
});

export const setCollection = mutation({
  args: {
    id: v.id("notes"),
    // Omit (or pass undefined) to remove the note from any collection.
    collectionId: v.optional(v.id("collections")),
  },
  handler: async (ctx, { id, collectionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    const note = await ctx.db.get(id);
    if (!note || note.userId !== userId) throw NOTE_NOT_FOUND();
    await ctx.db.patch(id, { collectionId, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    const note = await ctx.db.get(id);
    if (!note || note.userId !== userId) throw NOTE_NOT_FOUND();
    await ctx.db.delete(id);
  },
});
