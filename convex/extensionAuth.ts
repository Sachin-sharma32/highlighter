import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { appError } from "./errors";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "MARG-";
  for (let i = 0; i < 4; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  out += "-";
  for (let i = 0; i < 4; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function randomToken(): string {
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const createPairingCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      throw appError(
        "UNAUTHENTICATED",
        "Please sign in before generating a pairing code.",
      );

    const existing = await ctx.db
      .query("pairingCodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const c of existing) await ctx.db.delete(c._id);

    const code = randomCode();
    await ctx.db.insert("pairingCodes", {
      userId,
      code,
      expiresAt: Date.now() + CODE_TTL_MS,
    });
    return code;
  },
});

export const exchangePairingCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const entry = await ctx.db
      .query("pairingCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!entry)
      throw appError(
        "PAIRING_CODE_INVALID",
        "That pairing code didn’t match. Generate a fresh one from your dashboard and try again.",
      );
    if (Date.now() > entry.expiresAt) {
      await ctx.db.delete(entry._id);
      throw appError(
        "PAIRING_CODE_EXPIRED",
        "This pairing code has expired. Open the dashboard and generate a new one.",
      );
    }

    const userId = entry.userId;
    await ctx.db.delete(entry._id);

    const token = randomToken();
    await ctx.db.insert("extensionSessions", {
      userId,
      token,
      createdAt: Date.now(),
    });
    return { token, userId };
  },
});
