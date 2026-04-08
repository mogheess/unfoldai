# Unfold

Deep research on internal knowledge. Upload documents, ask complex questions, and get comprehensive answers with full source traceability.

Unfold decomposes your question into targeted sub-queries, performs semantic search across your indexed documents, and synthesizes a final answer with inline source citations linked to specific passages.

## Stack

- **Frontend**: Vue 3 + TypeScript + Tailwind CSS v4
- **Backend**: Convex (real-time database, vector search, server actions)
- **LLM**: Model-agnostic — supports OpenAI, Anthropic, Google Gemini, and DeepSeek via a unified provider interface. Embeddings use OpenAI text-embedding-3-small.
- **PDF parsing**: unpdf

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Initialize Convex

```bash
npx convex dev
```

This will prompt you to create a Convex project. Follow the steps, and it will generate your `.env.local` with `VITE_CONVEX_URL`.

### 3. Set API keys

In the [Convex dashboard](https://dashboard.convex.dev), go to your project > Settings > Environment Variables.

**Required** (used for embeddings and the default model):

```
OPENAI_API_KEY=sk-your-key-here
```

**Optional** (add any of these to enable additional models in the model selector):

```
ANTHROPIC_API_KEY=sk-ant-...     # Claude Opus 4.6 / Sonnet 4.6
GOOGLE_API_KEY=AIza...           # Gemini 3.1 Pro
DEEPSEEK_API_KEY=sk-...          # DeepSeek R1
```

These are server-side environment variables used by Convex actions. They never reach the browser.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## How it works

1. **Upload documents** (PDF, TXT, Markdown) via the Knowledge Base. Each document is chunked and embedded using OpenAI's text-embedding-3-small model, then stored in Convex's vector index.
2. **Ask a question**. The research pipeline runs in three stages, all visible in a live process log:
  - **Decompose** -- GPT-4o-mini breaks your question into 2-5 targeted sub-queries
  - **Search** -- Each sub-query is embedded and used for vector search across all document chunks
  - **Synthesize** -- All findings are streamed into a comprehensive answer with inline numbered citations
3. **Review sources**. Every claim in the answer links to a numbered source card showing the document name, passage location, and the exact excerpt used.

## Project structure

```
src/
  components/
    AppSidebar.vue        Collapsible sidebar navigation
    ResearchView.vue      Landing + research session orchestration
    ResearchResults.vue    Session query header + process + answer
    ResearchProcess.vue    Live timeline showing each pipeline stage
    ResearchAnswer.vue     Markdown-rendered answer with inline citations
    DocumentPanel.vue      Knowledge base upload + document list
  style.css               Design tokens and global styles
  main.ts                 App entry point

convex/
  schema.ts               Database schema (documents, chunks, researchSessions)
  documents.ts            Document CRUD
  ingest.ts               Chunking, embedding, PDF parsing
  chunks.ts               Chunk storage
  research.ts             3-stage deep research pipeline (model-agnostic)
  researchSessions.ts     Session state management
```

## Build

```bash
npm run build
```

## Deploy

Deploy the frontend to Vercel (or any static host):

```bash
npm install -g vercel
vercel
```

Set `VITE_CONVEX_URL` as an environment variable in your Vercel project settings.

Convex backend is already deployed when you run `npx convex deploy`.