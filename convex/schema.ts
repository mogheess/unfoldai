import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    name: v.string(),
    storageId: v.optional(v.id("_storage")),
    content: v.string(),
    chunkCount: v.number(),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  chunks: defineTable({
    documentId: v.id("documents"),
    documentName: v.string(),
    content: v.string(),
    chunkIndex: v.number(),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_document", ["documentId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["documentId"],
    }),

  researchSessions: defineTable({
    question: v.string(),
    status: v.union(
      v.literal("planning"),
      v.literal("searching"),
      v.literal("validating"),
      v.literal("synthesizing"),
      v.literal("complete"),
      v.literal("error")
    ),
    plan: v.optional(
      v.array(
        v.object({
          subQuery: v.string(),
          rationale: v.string(),
          status: v.union(
            v.literal("pending"),
            v.literal("searching"),
            v.literal("found"),
            v.literal("insufficient")
          ),
        })
      )
    ),
    findings: v.optional(
      v.array(
        v.object({
          subQuery: v.string(),
          passages: v.array(
            v.object({
              content: v.string(),
              documentName: v.string(),
              documentId: v.id("documents"),
              chunkIndex: v.number(),
              score: v.number(),
            })
          ),
          validated: v.boolean(),
        })
      )
    ),
    answer: v.optional(v.string()),
    sources: v.optional(
      v.array(
        v.object({
          documentName: v.string(),
          documentId: v.id("documents"),
          excerpt: v.string(),
          relevance: v.string(),
        })
      )
    ),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),
});
