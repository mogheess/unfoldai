<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useConvexQuery, useConvexClient } from "convex-vue";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ResearchResults from "./ResearchResults.vue";

const client = useConvexClient();
const { data: documents } = useConvexQuery(api.documents.list, {});

const question = ref("");
const activeSessionId = ref<Id<"researchSessions"> | null>(null);
const isSubmitting = ref(false);
const scrollArea = ref<HTMLElement | null>(null);

const readyDocs = ref(0);
watch(documents, (docs) => {
  if (docs) {
    readyDocs.value = docs.filter((d) => d.status === "ready").length;
  }
});

watch(activeSessionId, () => {
  nextTick(() => {
    if (scrollArea.value) scrollArea.value.scrollTop = 0;
  });
});

async function submitQuestion(text?: string) {
  const q = (text || question.value).trim();
  if (!q || isSubmitting.value) return;
  question.value = q;
  isSubmitting.value = true;
  try {
    const sessionId = await client.action(api.research.startResearch, { question: q });
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

const suggestions = [
  "Compare data security approaches across documents",
  "Summarize compliance obligations",
  "Key technical requirements and dependencies",
];
</script>

<template>
  <div class="flex h-full flex-col">
    <div ref="scrollArea" class="flex-1 overflow-y-auto">
      <!-- Landing: centered input -->
      <div v-if="!activeSessionId" class="flex h-full flex-col items-center justify-center px-6 md:px-8">
        <div class="w-full max-w-2xl -mt-10">
          <h1 class="mb-8 text-center text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] md:text-3xl">
            Deep research across<br />your documents
          </h1>

          <!-- Input bar -->
          <div class="flex items-end gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-200 focus-within:border-[var(--color-accent)]/30 focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <textarea
              v-model="question"
              @keydown="handleKeydown"
              :disabled="isSubmitting"
              placeholder="Ask a question..."
              rows="1"
              class="flex-1 resize-none bg-transparent text-[15px] leading-7 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
            />
            <button
              @click="submitQuestion()"
              :disabled="!question.trim() || isSubmitting || readyDocs === 0"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200"
              :class="
                !question.trim() || isSubmitting || readyDocs === 0
                  ? 'bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)] cursor-not-allowed'
                  : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm active:scale-95'
              "
            >
              <svg v-if="isSubmitting" width="16" height="16" viewBox="0 0 16 16" class="animate-spin">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="22" stroke-dashoffset="11" stroke-linecap="round" />
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <!-- Status + suggestions -->
          <div class="mt-4 flex flex-col items-center gap-4">
            <div
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              :class="
                readyDocs > 0
                  ? 'bg-[var(--color-success)] text-[var(--color-success-text)]'
                  : 'bg-[var(--color-warning)] text-[var(--color-warning-text)]'
              "
            >
              <div class="h-1.5 w-1.5 rounded-full" :class="readyDocs > 0 ? 'bg-[var(--color-success-text)]/40' : 'bg-[var(--color-warning-text)]/40'"></div>
              {{ readyDocs }} source{{ readyDocs !== 1 ? "s" : "" }} indexed
            </div>

            <div class="flex flex-wrap justify-center gap-2">
              <button
                v-for="(s, i) in suggestions"
                :key="i"
                @click="submitQuestion(s)"
                class="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
              >
                {{ s }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Active session -->
      <div v-if="activeSessionId" class="mx-auto max-w-4xl px-6 py-8 md:px-8">
        <ResearchResults
          :session-id="activeSessionId"
          @reset="activeSessionId = null"
        />
      </div>
    </div>
  </div>
</template>
