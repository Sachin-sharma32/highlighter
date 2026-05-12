import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { appError } from "./errors";

export const FREE_USAGE_LIMIT = 500;
// Each item type contributes a different number of units toward the limit.
export const HIGHLIGHT_UNIT_COST = 1;
export const NOTE_UNIT_COST = 5;
export const WHITEBOARD_UNIT_COST = 10;

// Kept for backwards compatibility with extension/popup code that still
// reads `limit` as a count of highlights.
export const FREE_HIGHLIGHT_LIMIT = FREE_USAGE_LIMIT;

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

export async function getNoteCounts(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<{ notes: number; whiteboards: number }> {
  const rows = await ctx.db
    .query("notes")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  let notes = 0;
  let whiteboards = 0;
  for (const row of rows) {
    if (row.type === "whiteboard") whiteboards += 1;
    else notes += 1;
  }
  return { notes, whiteboards };
}

export type UsageBreakdown = {
  highlights: number;
  notes: number;
  whiteboards: number;
  units: number;
  limit: number;
};

export async function getUsageBreakdown(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<UsageBreakdown> {
  const highlights = await getHighlightCount(ctx, userId);
  const { notes, whiteboards } = await getNoteCounts(ctx, userId);
  const units =
    highlights * HIGHLIGHT_UNIT_COST +
    notes * NOTE_UNIT_COST +
    whiteboards * WHITEBOARD_UNIT_COST;
  return {
    highlights,
    notes,
    whiteboards,
    units,
    limit: FREE_USAGE_LIMIT,
  };
}

async function assertCanAddUsageUnits(
  ctx: MutationCtx,
  userId: Id<"users">,
  added: number,
  kind: "highlight" | "note" | "whiteboard",
): Promise<void> {
  const plan = await getUserPlan(ctx, userId);
  if (plan === "premium") return;
  const breakdown = await getUsageBreakdown(ctx, userId);
  if (breakdown.units + added > FREE_USAGE_LIMIT) {
    const label =
      kind === "highlight"
        ? "highlights, notes, and whiteboards"
        : kind === "note"
          ? "notes, highlights, and whiteboards"
          : "whiteboards, notes, and highlights";
    throw appError(
      "FREE_LIMIT_REACHED",
      `You’ve reached the free plan usage limit (${FREE_USAGE_LIMIT} units across ${label}). Upgrade to Premium to keep going.`,
      { limit: FREE_USAGE_LIMIT },
    );
  }
}

export async function assertCanCreateHighlight(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  await assertCanAddUsageUnits(ctx, userId, HIGHLIGHT_UNIT_COST, "highlight");
}

export async function assertCanCreateNote(
  ctx: MutationCtx,
  userId: Id<"users">,
  type: "note" | "whiteboard",
): Promise<void> {
  const cost = type === "whiteboard" ? WHITEBOARD_UNIT_COST : NOTE_UNIT_COST;
  await assertCanAddUsageUnits(ctx, userId, cost, type);
}
