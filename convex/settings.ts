import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { appError } from "./errors";

export const getColors = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings?.highlightColors ?? null;
  },
});

export const saveColors = mutation({
  args: {
    colors: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      throw appError(
        "UNAUTHENTICATED",
        "Your session has expired. Please sign in again to save your settings.",
      );
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (settings) {
      await ctx.db.patch(settings._id, { highlightColors: args.colors });
    } else {
      await ctx.db.insert("settings", { userId, highlightColors: args.colors });
    }
  },
});
