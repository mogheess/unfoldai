<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useConvexQuery, useConvexMutation } from "convex-vue";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ResearchResults from "./ResearchResults.vue";

const kickResearch = useConvexMutation(api.researchSessions.kick);
const { data: documents } = useConvexQuery(api.documents.list, {});

const question = ref("");
const activeSessionId = ref<Id<"researchSessions"> | null>(null);
const isSubmitting = ref(false);
const scrollArea = ref<HTMLElement | null>(null);
const modelMenuOpen = ref(false);

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  badge?: string;
}

const models: ModelOption[] = [
  { id: "gpt-5.4", name: "GPT-5.4", provider: "OpenAI", badge: "default" },
  { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "OpenAI" },
  { id: "claude-opus-4.6", name: "Claude Opus 4.6", provider: "Anthropic" },
  { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", provider: "Anthropic" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", provider: "Google" },
  { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek" },
];

const selectedModel = ref<ModelOption>(models[0]);

function selectModel(model: ModelOption) {
  selectedModel.value = model;
  modelMenuOpen.value = false;
}

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
  isSubmitting.value = true;
  try {
    const sessionId = await kickResearch.mutate({ question: q, model: selectedModel.value.id });
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
  <div class="flex h-full flex-col" @click="modelMenuOpen = false">
    <div ref="scrollArea" class="flex-1 overflow-y-auto">
      <!-- Landing: centered input -->
      <div v-if="!activeSessionId" class="landing-hero relative flex h-full flex-col items-center justify-center px-6 md:px-8">
        <div class="landing-grid absolute inset-0 pointer-events-none" />
        <div class="landing-glow absolute pointer-events-none" />

        <div class="relative z-10 w-full max-w-2xl -mt-10">
          <h1 class="mb-8 text-center text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] md:text-3xl">
            Deep research across<br />your documents
          </h1>

          <!-- Input bar -->
          <div class="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-200 focus-within:border-[var(--color-accent)]/30 focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <div class="flex items-center gap-3 px-4 py-3">
              <textarea
                v-model="question"
                @keydown="handleKeydown"
                :disabled="isSubmitting"
                placeholder="Ask a question..."
                rows="1"
                class="flex-1 resize-none bg-transparent text-[15px] leading-7 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
              />
            </div>

            <!-- Bottom toolbar -->
            <div class="flex items-center justify-between border-t border-[var(--color-border-subtle)] px-3 py-2">
              <!-- Model selector -->
              <div class="relative">
                <button
                  @click.stop="modelMenuOpen = !modelMenuOpen"
                  class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="text-[var(--color-text-tertiary)]">
                    <path d="M6 1.5L10.5 4v4L6 10.5 1.5 8V4L6 1.5z" stroke="currentColor" stroke-width="1" stroke-linejoin="round" />
                    <circle cx="6" cy="6" r="1.5" stroke="currentColor" stroke-width="1" />
                  </svg>
                  {{ selectedModel.name }}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class="text-[var(--color-text-tertiary)]">
                    <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>

                <div
                  v-if="modelMenuOpen"
                  class="absolute bottom-full left-0 mb-1 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-fade-in"
                >
                  <div class="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
                    Model
                  </div>
                  <button
                    v-for="model in models"
                    :key="model.id"
                    @click.stop="selectModel(model)"
                    class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-sunken)]"
                    :class="selectedModel.id === model.id ? 'text-[var(--color-accent-text)]' : 'text-[var(--color-text-primary)]'"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="truncate font-medium">{{ model.name }}</span>
                      <span class="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">{{ model.provider }}</span>
                    </div>
                    <svg
                      v-if="selectedModel.id === model.id"
                      width="14" height="14" viewBox="0 0 14 14" class="shrink-0 text-[var(--color-accent)]"
                    >
                      <path d="M3.5 7l2.5 2.5L10.5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Submit -->
              <button
                @click="submitQuestion()"
                :disabled="!question.trim() || isSubmitting || readyDocs === 0"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200"
                :class="
                  !question.trim() || isSubmitting || readyDocs === 0
                    ? 'bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)] cursor-not-allowed'
                    : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm active:scale-95'
                "
              >
                <svg v-if="isSubmitting" width="14" height="14" viewBox="0 0 16 16" class="animate-spin">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="22" stroke-dashoffset="11" stroke-linecap="round" />
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Status + suggestions -->
          <div class="mt-5 flex flex-col items-center gap-4">
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
                class="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm px-3.5 py-2 text-xs text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
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

<style scoped>
.landing-grid {
  background-image:
    linear-gradient(to right, var(--color-border-subtle) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-border-subtle) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
}

.landing-glow {
  width: 480px;
  height: 480px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%);
  background: radial-gradient(circle, var(--color-accent-subtle) 0%, transparent 70%);
  opacity: 0.6;
}
</style>
