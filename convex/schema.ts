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
    sourceType: v.optional(v.union(v.literal("web"), v.literal("youtube"))),
    youtubeVideoId: v.optional(v.string()),
    clipStart: v.optional(v.number()),
    clipEnd: v.optional(v.number()),
    youtubeChannelTitle: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_url", ["userId", "url"])
    .index("by_user_collection", ["userId", "collectionId"])
    .index("by_user_createdAt", ["userId", "createdAt"]),

  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    type: v.optional(v.union(v.literal("note"), v.literal("whiteboard"))),
    collectionId: v.optional(v.id("collections")),
    starred: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updatedAt", ["userId", "updatedAt"])
    .index("by_user_collection", ["userId", "collectionId"]),

  todos: defineTable({
    userId: v.id("users"),
    text: v.string(),
    done: v.boolean(),
    link: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    // Target completion time (ms epoch). Drives the overdue indicator.
    dueAt: v.optional(v.number()),
    // When set, completing the todo spawns the next occurrence.
    recurrence: v.optional(
      v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    ),
    // When the todo was marked done (ms epoch); orders the Completed section.
    completedAt: v.optional(v.number()),
    // Lower `order` sorts first; new todos go to the top with a smaller value.
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_order", ["userId", "order"]),

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
      v.literal("expired"),
    ),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.optional(v.string()),
    razorpaySignature: v.optional(v.string()),
    activatedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    amountInPaise: v.optional(v.number()),
  }).index("by_user", ["userId"]),
});
