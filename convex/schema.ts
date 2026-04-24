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

  highlights: defineTable({
    userId: v.id("users"),
    url: v.string(),
    title: v.string(),
    author: v.optional(v.string()),
    text: v.string(),
    textContext: v.optional(v.string()),
    color: v.union(
      v.literal("amber"),
      v.literal("rose"),
      v.literal("sage"),
      v.literal("sky"),
      v.literal("violet")
    ),
    note: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
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
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_user", ["userId"]),
});
