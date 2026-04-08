import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("documents"),
      _creationTime: v.number(),
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
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("documents").order("desc").collect();
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    content: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", {
      name: args.name,
      content: args.content,
      storageId: args.storageId,
      chunkCount: 0,
      status: "processing",
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
    chunkCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.chunkCount !== undefined) {
      updates.chunkCount = args.chunkCount;
    }
    await ctx.db.patch(args.documentId, updates);
    return null;
  },
});

export const remove = mutation({
  args: { documentId: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    const doc = await ctx.db.get(args.documentId);
    if (doc?.storageId) {
      await ctx.storage.delete(doc.storageId);
    }

    await ctx.db.delete(args.documentId);
    return null;
  },
});
