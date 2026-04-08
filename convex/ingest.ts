"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 200;

function chunkText(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      const words = current.split(" ");
      const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
      current = overlapWords.join(" ") + " " + sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

async function generateEmbeddings(
  openai: OpenAI,
  texts: string[]
): Promise<number[][]> {
  const batchSize = 20;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });
    allEmbeddings.push(...response.data.map((d) => d.embedding));
  }

  return allEmbeddings;
}

export const processDocument = action({
  args: {
    documentId: v.id("documents"),
    content: v.string(),
    documentName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const chunks = chunkText(args.content);
      const embeddings = await generateEmbeddings(openai, chunks);

      for (let i = 0; i < chunks.length; i++) {
        await ctx.runMutation(api.chunks.insert, {
          documentId: args.documentId,
          documentName: args.documentName,
          content: chunks[i],
          chunkIndex: i,
          embedding: embeddings[i],
        });
      }

      await ctx.runMutation(api.documents.updateStatus, {
        documentId: args.documentId,
        status: "ready",
        chunkCount: chunks.length,
      });
    } catch (error) {
      console.error("Document processing failed:", error);
      await ctx.runMutation(api.documents.updateStatus, {
        documentId: args.documentId,
        status: "error",
      });
    }

    return null;
  },
});

export const parsePdf = action({
  args: { storageId: v.id("_storage") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new Error("File not found in storage");

    const buffer = Buffer.from(await blob.arrayBuffer());
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  },
});
