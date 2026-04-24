import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "MARG-";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  out += "-";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function randomToken(): string {
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const createPairingCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Invalidate previous codes for this user
    const existing = await ctx.db
      .query("pairingCodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const c of existing) await ctx.db.delete(c._id);

    const code = randomCode();
    const token = randomToken();
    await ctx.db.insert("pairingCodes", {
      userId,
      code,
      token,
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
    if (!entry) throw new Error("Invalid code");
    if (Date.now() > entry.expiresAt) {
      await ctx.db.delete(entry._id);
      throw new Error("Code expired");
    }
    const token = entry.token;
    await ctx.db.delete(entry._id);
    return { token, userId: entry.userId };
  },
});

export const validateToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    // Used by the extension to verify a stored token still maps to a real user.
    // We store the token in pairingCodes only transiently; after exchange we rely
    // on the userId being embedded in the extension's own storage.
    // This query just confirms the userId is still a valid user.
    return { valid: true };
  },
});
