<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useConvexQuery, useConvexClient } from "convex-vue";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ResearchProcess from "./ResearchProcess.vue";
import ResearchAnswer from "./ResearchAnswer.vue";

const client = useConvexClient();
const { data: documents } = useConvexQuery(api.documents.list, {});

const question = ref("");
const activeSessionId = ref<Id<"researchSessions"> | null>(null);
const isSubmitting = ref(false);
const resultsEl = ref<HTMLElement | null>(null);

const sessionArgs = ref<{ sessionId: Id<"researchSessions"> } | "skip">("skip");
const { data: session } = useConvexQuery(api.researchSessions.get, sessionArgs);

watch(activeSessionId, (id) => {
  if (id) {
    sessionArgs.value = { sessionId: id };
  } else {
    sessionArgs.value = "skip";
  }
});

watch(session, () => {
  nextTick(() => {
    resultsEl.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const readyDocs = ref(0);
watch(documents, (docs) => {
  if (docs) {
    readyDocs.value = docs.filter((d) => d.status === "ready").length;
  }
});

async function submitQuestion() {
  const q = question.value.trim();
  if (!q || isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    const sessionId = await client.action(api.research.startResearch, {
      question: q,
    });
    activeSessionId.value = sessionId;
    question.value = "";
  } catch (err) {
    console.error("Research failed:", err);
  } finally {
    isSubmitting.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submitQuestion();
  }
}
</script>

<template>
  <div>
    <!-- Hero Section -->
    <div
      v-if="!activeSessionId"
      class="animate-fade-in-up text-center pt-16 pb-12"
    >
      <h2
        class="text-4xl md:text-5xl font-bold tracking-tighter leading-none text-[var(--color-text-primary)]"
      >
        Ask complex questions.
        <br />
        <span class="text-[var(--color-text-tertiary)]">
          Get complete answers.
        </span>
      </h2>
      <p
        class="mt-4 text-sm text-[var(--color-text-secondary)] max-w-[55ch] mx-auto leading-relaxed"
      >
        Unfold breaks down your question into targeted sub-queries, searches
        across all your documents, validates the findings, and synthesizes a
        comprehensive answer with full source traceability.
      </p>
    </div>

    <!-- Input -->
    <div
      class="animate-fade-in-up stagger-1 max-w-3xl mx-auto"
      :class="activeSessionId ? 'mb-8' : 'mb-12'"
    >
      <div
        class="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-shadow duration-300 focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.06)] focus-within:border-[var(--color-text-tertiary)]"
      >
        <textarea
          v-model="question"
          @keydown="handleKeydown"
          :disabled="isSubmitting"
          placeholder="Ask a question that requires synthesis across your documents..."
          rows="3"
          class="w-full px-5 pt-4 pb-12 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] resize-none focus:outline-none"
        />

        <div
          class="absolute bottom-3 left-5 right-5 flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <span
              class="text-[10px] uppercase tracking-[0.1em] font-medium px-2 py-0.5 rounded-full"
              :class="
                readyDocs > 0
                  ? 'bg-[var(--color-success)] text-[var(--color-success-text)]'
                  : 'bg-[var(--color-warning)] text-[var(--color-warning-text)]'
              "
            >
              {{ readyDocs }} source{{ readyDocs !== 1 ? "s" : "" }} indexed
            </span>
          </div>

          <button
            @click="submitQuestion"
            :disabled="!question.trim() || isSubmitting || readyDocs === 0"
            class="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 active:scale-[0.97]"
            :class="
              !question.trim() || isSubmitting || readyDocs === 0
                ? 'bg-[var(--color-border)] text-[var(--color-text-tertiary)] cursor-not-allowed'
                : 'bg-[var(--color-text-primary)] text-[var(--color-surface)] hover:bg-[#333]'
            "
          >
            <template v-if="isSubmitting">
              <div
                class="w-3.5 h-3.5 border-2 border-[var(--color-surface)] border-t-transparent rounded-full animate-spin"
              />
              Researching
            </template>
            <template v-else> Research </template>
          </button>
        </div>
      </div>
    </div>

    <!-- Process Steps (when no session yet) -->
    <div
      v-if="!activeSessionId && !isSubmitting"
      class="animate-fade-in-up stagger-2 max-w-3xl mx-auto"
    >
      <div class="grid grid-cols-1 md:grid-cols-4 gap-px bg-[var(--color-border)] rounded-xl overflow-hidden border border-[var(--color-border)]">
        <div
          v-for="(step, i) in [
            { num: '01', title: 'Plan', desc: 'Decompose into sub-queries' },
            { num: '02', title: 'Search', desc: 'Semantic search per sub-query' },
            { num: '03', title: 'Validate', desc: 'Verify passage relevance' },
            { num: '04', title: 'Synthesize', desc: 'Combine into final answer' },
          ]"
          :key="i"
          class="bg-[var(--color-surface)] p-5"
        >
          <span
            class="text-[10px] font-mono text-[var(--color-text-tertiary)]"
          >
            {{ step.num }}
          </span>
          <p
            class="mt-1.5 text-sm font-medium text-[var(--color-text-primary)]"
          >
            {{ step.title }}
          </p>
          <p class="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
            {{ step.desc }}
          </p>
        </div>
      </div>
    </div>

    <!-- Research Results -->
    <div
      v-if="activeSessionId && session"
      ref="resultsEl"
      class="animate-fade-in-up max-w-3xl mx-auto"
    >
      <div class="mb-4">
        <p
          class="text-xs text-[var(--color-text-tertiary)] uppercase tracking-[0.1em] font-medium mb-1"
        >
          Research Query
        </p>
        <p class="text-lg font-medium text-[var(--color-text-primary)] leading-snug">
          {{ session.question }}
        </p>
      </div>

      <ResearchProcess :session="session" />

      <ResearchAnswer
        v-if="session.status === 'complete' || session.status === 'synthesizing'"
        :session="session"
      />

      <!-- Error -->
      <div
        v-if="session.status === 'error'"
        class="mt-6 p-4 rounded-xl bg-[var(--color-error)] border border-[var(--color-border)]"
      >
        <p class="text-sm text-[var(--color-error-text)]">
          Research encountered an error. Please try again.
        </p>
      </div>

      <!-- New Question -->
      <div class="mt-8 text-center">
        <button
          @click="activeSessionId = null"
          class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200 underline decoration-[var(--color-border)] underline-offset-4 hover:decoration-[var(--color-text-tertiary)]"
        >
          Start new research
        </button>
      </div>
    </div>
  </div>
</template>
