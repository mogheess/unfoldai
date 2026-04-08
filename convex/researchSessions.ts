import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: { question: v.string() },
  returns: v.id("researchSessions"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("researchSessions", {
      question: args.question,
      status: "planning",
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { sessionId: v.id("researchSessions") },
  returns: v.union(
    v.object({
      _id: v.id("researchSessions"),
      _creationTime: v.number(),
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("researchSessions"),
      _creationTime: v.number(),
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
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("researchSessions")
      .withIndex("by_created")
      .order("desc")
      .take(20);
  },
});

export const updateStatus = mutation({
  args: {
    sessionId: v.id("researchSessions"),
    status: v.union(
      v.literal("planning"),
      v.literal("searching"),
      v.literal("validating"),
      v.literal("synthesizing"),
      v.literal("complete"),
      v.literal("error")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { status: args.status });
    return null;
  },
});

export const setPlan = mutation({
  args: {
    sessionId: v.id("researchSessions"),
    plan: v.array(
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
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { plan: args.plan });
    return null;
  },
});

export const updateSubQueryStatus = mutation({
  args: {
    sessionId: v.id("researchSessions"),
    index: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("searching"),
      v.literal("found"),
      v.literal("insufficient")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session?.plan) return null;

    const updatedPlan = [...session.plan];
    if (updatedPlan[args.index]) {
      updatedPlan[args.index] = {
        ...updatedPlan[args.index],
        status: args.status,
      };
    }
    await ctx.db.patch(args.sessionId, { plan: updatedPlan });
    return null;
  },
});

export const setFindings = mutation({
  args: {
    sessionId: v.id("researchSessions"),
    findings: v.array(
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
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { findings: args.findings });
    return null;
  },
});

export const complete = mutation({
  args: {
    sessionId: v.id("researchSessions"),
    answer: v.string(),
    sources: v.array(
      v.object({
        documentName: v.string(),
        documentId: v.id("documents"),
        excerpt: v.string(),
        relevance: v.string(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "complete",
      answer: args.answer,
      sources: args.sources,
    });
    return null;
  },
});

export const getChunk = query({
  args: { chunkId: v.id("chunks") },
  returns: v.union(
    v.object({
      _id: v.id("chunks"),
      _creationTime: v.number(),
      documentId: v.id("documents"),
      documentName: v.string(),
      content: v.string(),
      chunkIndex: v.number(),
      embedding: v.optional(v.array(v.float64())),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chunkId);
  },
});
