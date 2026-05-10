import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { appError } from "./errors";

export const FREE_HIGHLIGHT_LIMIT = 500;
export const PREMIUM_PRICE_PAISE = 19900; // ₹199
export const PREMIUM_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export type Plan = "free" | "premium";

export async function getUserPlan(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<Plan> {
  const sub = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!sub) return "free";
  if (sub.plan !== "premium" || sub.status !== "active") return "free";
  if (sub.expiresAt && Date.now() > sub.expiresAt) return "free";
  return "premium";
}

export async function getHighlightCount(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<number> {
  const rows = await ctx.db
    .query("highlights")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return rows.length;
}

export async function assertCanCreateHighlight(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const plan = await getUserPlan(ctx, userId);
  if (plan === "premium") return;
  const count = await getHighlightCount(ctx, userId);
  if (count >= FREE_HIGHLIGHT_LIMIT) {
    throw appError(
      "FREE_LIMIT_REACHED",
      `You’ve reached the free plan limit of ${FREE_HIGHLIGHT_LIMIT} highlights. Upgrade to Premium to save more.`,
      { limit: FREE_HIGHLIGHT_LIMIT },
    );
  }
}
