import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const kick = mutation({
  args: {
    question: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.id("researchSessions"),
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("researchSessions", {
      question: args.question,
      model: args.model,
      status: "planning",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.research.runPipeline, {
      sessionId,
      question: args.question,
      model: args.model,
    });
    return sessionId;
  },
});

const sessionStatusValidator = v.union(
  v.literal("planning"),
  v.literal("searching"),
  v.literal("validating"),
  v.literal("synthesizing"),
  v.literal("complete"),
  v.literal("error")
);

const findingsValidator = v.array(
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
    validated: v.optional(v.boolean()),
  })
);

const sourcesValidator = v.array(
  v.object({
    documentName: v.string(),
    documentId: v.id("documents"),
    excerpt: v.string(),
    relevance: v.string(),
  })
);

const planValidator = v.array(
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
);

const sessionObjectValidator = v.object({
  _id: v.id("researchSessions"),
  _creationTime: v.number(),
  question: v.string(),
  model: v.optional(v.string()),
  status: sessionStatusValidator,
  plan: v.optional(planValidator),
  findings: v.optional(findingsValidator),
  answer: v.optional(v.string()),
  sources: v.optional(sourcesValidator),
  createdAt: v.number(),
});

export const get = query({
  args: { sessionId: v.id("researchSessions") },
  returns: v.union(sessionObjectValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const list = query({
  args: {},
  returns: v.array(sessionObjectValidator),
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
    status: sessionStatusValidator,
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
    plan: planValidator,
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
    findings: findingsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { findings: args.findings });
    return null;
  },
});

export const updateAnswer = mutation({
  args: {
    sessionId: v.id("researchSessions"),
    answer: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { answer: args.answer });
    return null;
  },
});

export const complete = mutation({
  args: {
    sessionId: v.id("researchSessions"),
    answer: v.string(),
    sources: sourcesValidator,
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
