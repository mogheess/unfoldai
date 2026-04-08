"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import OpenAI from "openai";

export const startResearch = action({
  args: { question: v.string() },
  returns: v.id("researchSessions"),
  handler: async (ctx, args): Promise<Id<"researchSessions">> => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const sessionId = await ctx.runMutation(
      api.researchSessions.create,
      { question: args.question }
    );

    try {
      // --- Step 1: Plan ---
      await ctx.runMutation(api.researchSessions.updateStatus, {
        sessionId,
        status: "planning",
      });

      const plan = await decomposeQuestion(openai, args.question);

      await ctx.runMutation(api.researchSessions.setPlan, {
        sessionId,
        plan: plan.map((p) => ({
          subQuery: p.subQuery,
          rationale: p.rationale,
          status: "pending" as const,
        })),
      });

      // --- Step 2: Search ---
      await ctx.runMutation(api.researchSessions.updateStatus, {
        sessionId,
        status: "searching",
      });

      type Passage = {
        content: string;
        documentName: string;
        documentId: Id<"documents">;
        chunkIndex: number;
        score: number;
      };
      type Finding = {
        subQuery: string;
        passages: Passage[];
        validated: boolean;
      };

      const allFindings: Finding[] = [];

      for (let i = 0; i < plan.length; i++) {
        const subQuery = plan[i];

        await ctx.runMutation(api.researchSessions.updateSubQueryStatus, {
          sessionId,
          index: i,
          status: "searching",
        });

        const queryEmbedding = await getEmbedding(openai, subQuery.subQuery);
        const results = await ctx.vectorSearch("chunks", "by_embedding", {
          vector: queryEmbedding,
          limit: 6,
        });

        const passages: Passage[] = [];
        for (const result of results) {
          const chunk = await ctx.runQuery(api.researchSessions.getChunk, {
            chunkId: result._id,
          });
          if (chunk) {
            passages.push({
              content: chunk.content,
              documentName: chunk.documentName,
              documentId: chunk.documentId,
              chunkIndex: chunk.chunkIndex,
              score: result._score,
            });
          }
        }

        const finding = {
          subQuery: subQuery.subQuery,
          passages,
          validated: false,
        };

        allFindings.push(finding);

        await ctx.runMutation(api.researchSessions.updateSubQueryStatus, {
          sessionId,
          index: i,
          status: passages.length > 0 ? "found" : "insufficient",
        });
      }

      await ctx.runMutation(api.researchSessions.setFindings, {
        sessionId,
        findings: allFindings,
      });

      // --- Step 3: Validate ---
      await ctx.runMutation(api.researchSessions.updateStatus, {
        sessionId,
        status: "validating",
      });

      const validatedFindings = await validateFindings(
        openai,
        args.question,
        allFindings
      );

      await ctx.runMutation(api.researchSessions.setFindings, {
        sessionId,
        findings: validatedFindings,
      });

      // --- Step 4: Synthesize ---
      await ctx.runMutation(api.researchSessions.updateStatus, {
        sessionId,
        status: "synthesizing",
      });

      const { answer, sources } = await synthesize(
        openai,
        args.question,
        validatedFindings
      );

      await ctx.runMutation(api.researchSessions.complete, {
        sessionId,
        answer,
        sources,
      });
    } catch (error) {
      console.error("Research failed:", error);
      await ctx.runMutation(api.researchSessions.updateStatus, {
        sessionId,
        status: "error",
      });
    }

    return sessionId;
  },
});

async function getEmbedding(openai: OpenAI, text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

async function decomposeQuestion(
  openai: OpenAI,
  question: string
): Promise<Array<{ subQuery: string; rationale: string }>> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a research planner. Given a complex question, break it down into 2-5 targeted sub-queries that together will provide a comprehensive answer.

Return JSON: { "subQueries": [{ "subQuery": "specific search query", "rationale": "why this helps answer the main question" }] }

Rules:
- Each sub-query should target a distinct aspect of the question
- Sub-queries should be specific enough for semantic search against documents
- Order them logically (foundational info first, synthesis questions last)`,
      },
      { role: "user", content: question },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");
  return parsed.subQueries || [];
}

async function validateFindings(
  openai: OpenAI,
  question: string,
  findings: Array<{
    subQuery: string;
    passages: Array<{
      content: string;
      documentName: string;
      documentId: Id<"documents">;
      chunkIndex: number;
      score: number;
    }>;
    validated: boolean;
  }>
) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a research validator. For each sub-query and its retrieved passages, determine if the passages contain sufficient relevant information to answer that sub-query.

Return JSON: { "validations": [{ "index": 0, "validated": true/false, "reason": "brief explanation" }] }`,
      },
      {
        role: "user",
        content: `Main question: ${question}\n\nFindings:\n${JSON.stringify(findings.map((f, i) => ({ index: i, subQuery: f.subQuery, passageCount: f.passages.length, topPassages: f.passages.slice(0, 3).map((p) => p.content.slice(0, 200)) })), null, 2)}`,
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");
  const validations = parsed.validations || [];

  return findings.map((f, i) => {
    const v = validations.find(
      (val: { index: number; validated: boolean }) => val.index === i
    );
    const validated: boolean = v?.validated ?? f.passages.length > 0;
    return { ...f, validated };
  });
}

async function synthesize(
  openai: OpenAI,
  question: string,
  findings: Array<{
    subQuery: string;
    passages: Array<{
      content: string;
      documentName: string;
      documentId: Id<"documents">;
      chunkIndex: number;
      score: number;
    }>;
    validated: boolean;
  }>
): Promise<{
  answer: string;
  sources: Array<{
    documentName: string;
    documentId: Id<"documents">;
    excerpt: string;
    relevance: string;
  }>;
}> {
  const context = findings
    .filter((f) => f.validated && f.passages.length > 0)
    .map(
      (f) =>
        `## Sub-query: ${f.subQuery}\n${f.passages.map((p) => `[Source: ${p.documentName}] ${p.content}`).join("\n\n")}`
    )
    .join("\n\n---\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert research synthesizer. Given a question and validated research findings from internal documents, produce a comprehensive answer.

CRITICAL RULES:
- ONLY use information from the provided sources. Never add external knowledge.
- Cite sources inline using [Source: document name] notation
- Be precise, factual, and thorough

Return JSON:
{
  "answer": "comprehensive answer with inline citations using [Source: name] format",
  "sources": [{ "documentName": "name", "documentId": "id", "excerpt": "key quote from source", "relevance": "how this source contributed" }]
}`,
      },
      {
        role: "user",
        content: `Question: ${question}\n\nResearch findings:\n${context}`,
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");
  const sources = (parsed.sources || []).map(
    (s: { documentName: string; documentId: string; excerpt: string; relevance: string }) => ({
      documentName: s.documentName,
      documentId: s.documentId as Id<"documents">,
      excerpt: s.excerpt,
      relevance: s.relevance,
    })
  );
  return {
    answer: parsed.answer || "Unable to synthesize an answer from available sources.",
    sources,
  };
}
