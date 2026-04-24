import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  collections: defineTable({
    userId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  settings: defineTable({
    userId: v.id("users"),
    highlightColors: v.any(),
  }).index("by_user", ["userId"]),

  highlights: defineTable({
    userId: v.id("users"),
    url: v.string(),
    title: v.string(),
    author: v.optional(v.string()),
    text: v.string(),
    textContext: v.optional(v.string()),
    anchorPrefix: v.optional(v.string()),
    anchorSuffix: v.optional(v.string()),
    anchorStart: v.optional(v.number()),
    anchorEnd: v.optional(v.number()),
    color: v.string(),
    note: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    collectionIds: v.optional(v.array(v.id("collections"))),
    tags: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_url", ["userId", "url"])
    .index("by_user_collection", ["userId", "collectionId"])
    .index("by_user_createdAt", ["userId", "createdAt"]),

  pairingCodes: defineTable({
    userId: v.id("users"),
    code: v.string(),
    token: v.optional(v.string()),
    expiresAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_user", ["userId"]),

  extensionSessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("premium")),
    status: v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("cancelled"),
      v.literal("expired")
    ),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.optional(v.string()),
    razorpaySignature: v.optional(v.string()),
    activatedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    amountInPaise: v.optional(v.number()),
  }).index("by_user", ["userId"]),
});
