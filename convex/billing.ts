import { v } from "convex/values";
import {
  action,
  httpAction,
  mutation,
  query,
  internalMutation,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  getUserPlan,
  getUsageBreakdown,
  FREE_USAGE_LIMIT,
  HIGHLIGHT_UNIT_COST,
  NOTE_UNIT_COST,
  WHITEBOARD_UNIT_COST,
  PREMIUM_PRICE_PAISE,
  PREMIUM_PERIOD_MS,
} from "./plan";
import { appError } from "./errors";

const NOT_AUTHENTICATED = () =>
  appError(
    "UNAUTHENTICATED",
    "Your session has expired. Please sign in again to continue.",
  );

const PAYMENTS_NOT_CONFIGURED = () =>
  appError(
    "PAYMENTS_NOT_CONFIGURED",
    "Payments aren’t available right now. Please try again in a few minutes.",
  );

declare const process: { env: Record<string, string | undefined> };

function getRazorpayCreds() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        plan: "free" as const,
        count: 0,
        units: 0,
        highlights: 0,
        notes: 0,
        whiteboards: 0,
        limit: FREE_USAGE_LIMIT,
        pricePaise: PREMIUM_PRICE_PAISE,
        costs: {
          highlight: HIGHLIGHT_UNIT_COST,
          note: NOTE_UNIT_COST,
          whiteboard: WHITEBOARD_UNIT_COST,
        },
      };
    }
    const plan = await getUserPlan(ctx, userId);
    const breakdown = await getUsageBreakdown(ctx, userId);
    return {
      plan,
      // `count` retained so older clients keep working — now represents
      // total usage units, not raw highlight count.
      count: breakdown.units,
      units: breakdown.units,
      highlights: breakdown.highlights,
      notes: breakdown.notes,
      whiteboards: breakdown.whiteboards,
      limit: FREE_USAGE_LIMIT,
      pricePaise: PREMIUM_PRICE_PAISE,
      costs: {
        highlight: HIGHLIGHT_UNIT_COST,
        note: NOTE_UNIT_COST,
        whiteboard: WHITEBOARD_UNIT_COST,
      },
    };
  },
});

export const isPaymentsConfigured = query({
  args: {},
  handler: async () => {
    return getRazorpayCreds() !== null;
  },
});

export const createOrder = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    orderId: string;
    keyId: string;
    amount: number;
    currency: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();

    const creds = getRazorpayCreds();
    if (!creds) throw PAYMENTS_NOT_CONFIGURED();

    const auth = btoa(`${creds.keyId}:${creds.keySecret}`);
    const receipt = `marg_${userId.slice(0, 10)}_${Date.now().toString(36)}`;
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: PREMIUM_PRICE_PAISE,
        currency: "INR",
        receipt,
        notes: { userId },
      }),
    });

    if (!res.ok) {
      throw appError(
        "PAYMENT_PROVIDER_FAILED",
        "We couldn’t start checkout right now. Please try again in a moment.",
      );
    }

    const order = (await res.json()) as {
      id: string;
      amount: number;
      currency: string;
    };

    await ctx.runMutation(internal.billing.recordPendingOrder, {
      userId,
      orderId: order.id,
      amountInPaise: PREMIUM_PRICE_PAISE,
    });

    return {
      orderId: order.id,
      keyId: creds.keyId,
      amount: order.amount,
      currency: order.currency,
    };
  },
});

export const recordPendingOrder = internalMutation({
  args: {
    userId: v.id("users"),
    orderId: v.string(),
    amountInPaise: v.number(),
  },
  handler: async (ctx, { userId, orderId, amountInPaise }) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        plan:
          existing.plan === "premium" && existing.status === "active"
            ? "premium"
            : "free",
        status: "pending",
        razorpayOrderId: orderId,
        amountInPaise,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId,
        plan: "free",
        status: "pending",
        razorpayOrderId: orderId,
        amountInPaise,
      });
    }
  },
});

export const verifyPayment = action({
  args: {
    orderId: v.string(),
    paymentId: v.string(),
    signature: v.string(),
  },
  handler: async (
    ctx,
    { orderId, paymentId, signature },
  ): Promise<{ ok: true }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();

    const creds = getRazorpayCreds();
    if (!creds) throw PAYMENTS_NOT_CONFIGURED();

    const payload = `${orderId}|${paymentId}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(creds.keySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuf = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );
    const expected = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (expected !== signature)
      throw appError(
        "PAYMENT_VERIFICATION_FAILED",
        "We couldn’t verify your payment. If you were charged, contact support and we’ll sort it out.",
      );

    await ctx.runMutation(internal.billing.activatePremium, {
      userId,
      orderId,
      paymentId,
      signature,
    });

    return { ok: true };
  },
});

export const activatePremium = internalMutation({
  args: {
    userId: v.id("users"),
    orderId: v.string(),
    paymentId: v.string(),
    signature: v.optional(v.string()),
  },
  handler: async (ctx, { userId, orderId, paymentId, signature }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    // Idempotent: if we've already activated this exact payment, do nothing.
    if (
      existing &&
      existing.status === "active" &&
      existing.razorpayPaymentId === paymentId
    ) {
      return;
    }
    const fields = {
      plan: "premium" as const,
      status: "active" as const,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      activatedAt: now,
      expiresAt: now + PREMIUM_PERIOD_MS,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("subscriptions", { userId, ...fields });
    }
  },
});

export const markPaymentFailed = internalMutation({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("razorpayOrderId"), orderId))
      .first();
    if (!sub) return;
    if (sub.status === "active") return;
    await ctx.db.patch(sub._id, { status: "expired" });
  },
});

type RazorpayWebhookPayload = {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity: {
        id: string;
        notes?: Record<string, string>;
      };
    };
  };
};

async function verifyRazorpayWebhook(
  rawBody: string,
  receivedSignature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time compare on equal-length strings.
  if (expected.length !== receivedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

export const razorpayWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook not configured", { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await request.text();
  const valid = await verifyRazorpayWebhook(rawBody, signature, secret);
  if (!valid) return new Response("Invalid signature", { status: 400 });

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = payload.event;
  const payment = payload.payload.payment?.entity;
  const order = payload.payload.order?.entity;

  // Resolve order id and userId. `notes.userId` is set by createOrder above.
  const orderId = payment?.order_id ?? order?.id;
  const userIdNote = payment?.notes?.userId ?? order?.notes?.userId;

  if (event === "payment.captured" || event === "order.paid") {
    if (!orderId || !userIdNote || !payment?.id) {
      return new Response("Missing required fields", { status: 400 });
    }
    await ctx.runMutation(internal.billing.activatePremium, {
      userId: userIdNote as Id<"users">,
      orderId,
      paymentId: payment.id,
      signature: undefined,
    });
    return new Response("ok", { status: 200 });
  }

  if (event === "payment.failed" && orderId) {
    await ctx.runMutation(internal.billing.markPaymentFailed, { orderId });
    return new Response("ok", { status: 200 });
  }

  // Acknowledge events we don't act on so Razorpay stops retrying.
  return new Response("ignored", { status: 200 });
});

export const cancelPremium = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw NOT_AUTHENTICATED();
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!sub) return;
    await ctx.db.patch(sub._id, { status: "cancelled" });
  },
});
