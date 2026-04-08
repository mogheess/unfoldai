"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import OpenAI from "openai";

interface ProviderConfig {
  client: OpenAI;
  chatModel: string;
}

const PROVIDERS: Record<string, () => ProviderConfig> = {
  "gpt-5.4": () => ({
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    chatModel: "gpt-4o-mini",
  }),
  "gpt-4o-mini": () => ({
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    chatModel: "gpt-4o-mini",
  }),
  "claude-opus-4.6": () => ({
    client: new OpenAI({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: "https://api.anthropic.com/v1/",
    }),
    chatModel: "claude-opus-4-6-20250205",
  }),
  "claude-sonnet-4.6": () => ({
    client: new OpenAI({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: "https://api.anthropic.com/v1/",
    }),
    chatModel: "claude-sonnet-4-6-20250514",
  }),
  "gemini-3.1-pro": () => ({
    client: new OpenAI({
      apiKey: process.env.GOOGLE_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    }),
    chatModel: "gemini-2.5-pro-preview-05-06",
  }),
  "deepseek-r1": () => ({
    client: new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    }),
    chatModel: "deepseek-reasoner",
  }),
};

function getProvider(modelId?: string): ProviderConfig {
  const factory = PROVIDERS[modelId ?? "gpt-4o-mini"] ?? PROVIDERS["gpt-4o-mini"];
  return factory();
}

export const runPipeline = internalAction({
  args: {
    sessionId: v.id("researchSessions"),
    question: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const embeddingClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { client: chatClient, chatModel } = getProvider(args.model);
    const sessionId: Id<"researchSessions"> = args.sessionId;

    try {
      const plan = await decomposeQuestion(chatClient, chatModel, args.question);

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
      };

      const allFindings: Finding[] = [];

      for (let i = 0; i < plan.length; i++) {
        const subQuery = plan[i];

        await ctx.runMutation(api.researchSessions.updateSubQueryStatus, {
          sessionId,
          index: i,
          status: "searching",
        });

        const queryEmbedding = await getEmbedding(embeddingClient, subQuery.subQuery);
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

        allFindings.push({
          subQuery: subQuery.subQuery,
          passages,
        });

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

      // --- Step 3: Synthesize ---
      await ctx.runMutation(api.researchSessions.updateStatus, {
        sessionId,
        status: "synthesizing",
      });

      const { answer, sources } = await synthesize(
        chatClient,
        chatModel,
        args.question,
        allFindings,
        async (partial: string) => {
          await ctx.runMutation(api.researchSessions.updateAnswer, {
            sessionId,
            answer: partial,
          });
        }
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

    return null;
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
  client: OpenAI,
  model: string,
  question: string
): Promise<Array<{ subQuery: string; rationale: string }>> {
  const response = await client.chat.completions.create({
    model,
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

async function synthesize(
  client: OpenAI,
  model: string,
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
  }>,
  onPartial: (text: string) => Promise<void>
): Promise<{
  answer: string;
  sources: Array<{
    documentName: string;
    documentId: Id<"documents">;
    excerpt: string;
    relevance: string;
  }>;
}> {
  const allPassages = findings
    .filter((f) => f.passages.length > 0)
    .flatMap((f) => f.passages);

  const passageIndex = new Map<string, { passage: typeof allPassages[0]; tag: string }>();
  let tagCounter = 1;
  for (const p of allPassages) {
    const key = `${p.documentName}:${p.chunkIndex}`;
    if (!passageIndex.has(key)) {
      const tag = `[${tagCounter}]`;
      passageIndex.set(key, { passage: p, tag });
      tagCounter++;
    }
  }

  const context = findings
    .filter((f) => f.passages.length > 0)
    .map((f) => {
      const passageTexts = f.passages.map((p) => {
        const key = `${p.documentName}:${p.chunkIndex}`;
        const entry = passageIndex.get(key);
        const tag = entry?.tag ?? "";
        return `${tag} (from ${p.documentName}): ${p.content}`;
      });
      return `## Sub-query: ${f.subQuery}\n${passageTexts.join("\n\n")}`;
    })
    .join("\n\n---\n\n");

  const sourceList = [...passageIndex.entries()]
    .map(([, { passage, tag }]) => `${tag} = ${passage.documentName}`)
    .join("\n");

  const stream = await client.chat.completions.create({
    model,
    temperature: 0.3,
    stream: true,
    messages: [
      {
        role: "system",
        content: `You are an expert research synthesizer. Given a question and numbered research passages from internal documents, produce a comprehensive answer.

CRITICAL RULES:
- ONLY use information from the provided sources. Never add external knowledge.
- Cite sources using the EXACT numbered tags provided, e.g. [1], [2], [3].
- Place citations immediately after the claim they support.
- Use DIFFERENT citation numbers to show you draw from multiple passages. Do NOT always use the same one.
- Be precise, factual, and thorough.
- Write in clear paragraphs. Use - for lists when appropriate. Do NOT use bold or markdown emphasis.
- Do NOT wrap in JSON. Write the answer as plain text.`,
      },
      {
        role: "user",
        content: `Question: ${question}\n\nSource index:\n${sourceList}\n\nResearch passages:\n${context}`,
      },
    ],
  });

  let answer = "";
  let lastFlush = 0;
  const FLUSH_INTERVAL = 300;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      answer += delta;
      const now = Date.now();
      if (now - lastFlush > FLUSH_INTERVAL) {
        await onPartial(answer);
        lastFlush = now;
      }
    }
  }

  await onPartial(answer);

  if (!answer.trim()) {
    answer = "Unable to synthesize an answer from available sources.";
  }

  const citedTags = new Set<number>();
  const citeRegex = /\[(\d+)\]/g;
  let match;
  while ((match = citeRegex.exec(answer)) !== null) {
    citedTags.add(parseInt(match[1]));
  }

  const sources: Array<{
    documentName: string;
    documentId: Id<"documents">;
    excerpt: string;
    relevance: string;
  }> = [];

  let sourceIdx = 1;
  for (const [, { passage }] of passageIndex) {
    if (citedTags.has(sourceIdx)) {
      sources.push({
        documentName: passage.documentName,
        documentId: passage.documentId,
        excerpt: passage.content.slice(0, 250),
        relevance: `Passage ${passage.chunkIndex + 1} from ${passage.documentName}`,
      });
    }
    sourceIdx++;
  }

  return { answer, sources };
}
