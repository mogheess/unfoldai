import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const insert = mutation({
  args: {
    documentId: v.id("documents"),
    documentName: v.string(),
    content: v.string(),
    chunkIndex: v.number(),
    embedding: v.array(v.float64()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("chunks", {
      documentId: args.documentId,
      documentName: args.documentName,
      content: args.content,
      chunkIndex: args.chunkIndex,
      embedding: args.embedding,
    });
    return null;
  },
});
