<script setup lang="ts">
import { ref, computed } from "vue";
import type { Id } from "../../convex/_generated/dataModel";

interface Source {
  documentName: string;
  documentId: Id<"documents">;
  excerpt: string;
  relevance: string;
}

interface Session {
  status: string;
  answer?: string;
  sources?: Source[];
}

const props = defineProps<{ session: Session }>();
const highlightedSource = ref<number | null>(null);
const sourcesExpanded = ref(false);

const isStreaming = computed(() => props.session.status === "synthesizing");
const isComplete = computed(() => props.session.status === "complete");
const hasAnswer = computed(() => !!props.session.answer);

const sourceCount = computed(() => props.session.sources?.length ?? 0);

const renderedAnswer = computed(() => {
  if (!props.session.answer) return "";
  let text = props.session.answer;

  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/\n{2,}/g, "</p><p>");
  text = text.replace(/\n- /g, "\n<li>");
  text = text.replace(/<li>(.*?)(?=\n<li>|<\/p>|$)/g, "<li>$1</li>");
  text = text.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

  text = text.replace(/\[(\d+)\]/g, (_match, numStr: string) => {
    const num = parseInt(numStr);
    if (isComplete.value && sourceCount.value > 0 && num >= 1 && num <= sourceCount.value) {
      const idx = num - 1;
      return `<button class="source-ref" data-idx="${idx}" onclick="this.dispatchEvent(new CustomEvent('cite',{bubbles:true,detail:${idx}}))">[${num}]</button>`;
    }
    if (isStreaming.value) {
      return `<span class="source-ref-muted">[${num}]</span>`;
    }
    return `[${num}]`;
  });

  text = text.replace(/\[Source:\s*[^\]]+\]/g, "");

  return `<p>${text}</p>`;
});

function scrollToSource(idx: number) {
  sourcesExpanded.value = true;
  highlightedSource.value = idx;
  setTimeout(() => {
    const el = document.getElementById(`source-${idx}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 50);
  setTimeout(() => { highlightedSource.value = null; }, 2000);
}

function handleCite(e: Event) {
  const custom = e as CustomEvent;
  if (custom.detail !== undefined) scrollToSource(custom.detail);
}
</script>

<template>
  <div class="animate-fade-in">
    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div class="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3">
        <div class="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--color-text-primary)]">
          <svg width="10" height="10" viewBox="0 0 10 10" class="text-[var(--color-surface)]">
            <path d="M1 5h8M5 1v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <span class="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
          Synthesized Answer
        </span>
        <span
          v-if="isStreaming"
          class="ml-auto inline-flex items-center gap-1.5 text-[11px] text-[var(--color-accent-text)]"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
          Writing
        </span>
      </div>

      <div class="px-5 py-5">
        <div v-if="!hasAnswer && isStreaming" class="flex items-center gap-3 py-4">
          <div class="h-4 w-4 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
          <span class="text-sm text-[var(--color-text-secondary)]">Synthesizing findings...</span>
        </div>

        <div v-if="hasAnswer">
          <div
            class="prose-answer max-w-none text-[14px] leading-7 text-[var(--color-text-primary)]"
            @cite="handleCite"
            v-html="renderedAnswer"
          />
          <span
            v-if="isStreaming"
            class="streaming-cursor"
          />
        </div>
      </div>
    </div>

    <!-- Sources (collapsible) -->
    <div v-if="isComplete && session.sources && session.sources.length > 0" class="mt-5 animate-fade-in">
      <button
        @click="sourcesExpanded = !sourcesExpanded"
        class="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-[var(--color-surface-sunken)]"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="text-[var(--color-text-tertiary)]">
          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" transform="scale(0.6) translate(1,1)" />
        </svg>
        <span class="text-xs font-medium text-[var(--color-text-secondary)]">
          {{ session.sources.length }} source{{ session.sources.length !== 1 ? "s" : "" }} referenced
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          class="ml-auto text-[var(--color-text-tertiary)] transition-transform duration-200"
          :class="sourcesExpanded ? 'rotate-180' : ''"
        >
          <path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <div v-if="sourcesExpanded" class="mt-2 space-y-2">
        <div
          v-for="(source, idx) in session.sources"
          :key="idx"
          :id="`source-${idx}`"
          class="animate-fade-in flex items-start gap-3 rounded-lg border bg-[var(--color-surface)] px-4 py-3 transition-all duration-300"
          :class="highlightedSource === idx ? 'border-[var(--color-accent)] shadow-[0_0_0_3px_var(--color-accent-subtle)]' : 'border-[var(--color-border)]'"
          :style="{ animationDelay: `${idx * 80}ms` }"
        >
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-subtle)] text-[11px] font-mono font-bold text-[var(--color-accent-text)]">
            {{ idx + 1 }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2">
              <p class="text-sm font-semibold text-[var(--color-text-primary)]">{{ source.documentName }}</p>
              <span v-if="source.relevance && source.relevance !== 'Cited in synthesized answer'" class="text-[11px] text-[var(--color-text-tertiary)]">
                {{ source.relevance }}
              </span>
            </div>
            <p v-if="source.excerpt" class="mt-1.5 rounded-md bg-[var(--color-canvas)] px-3 py-2 text-xs leading-relaxed text-[var(--color-text-secondary)] line-clamp-3 border-l-2 border-[var(--color-accent-subtle)]">
              {{ source.excerpt }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.prose-answer p { margin-bottom: 0.75rem; }
.prose-answer p:last-child { margin-bottom: 0; }
.prose-answer ul { margin: 0.5rem 0; padding-left: 1.25rem; list-style: disc; }
.prose-answer li { margin-bottom: 0.25rem; }

.source-ref {
  display: inline;
  cursor: pointer;
  font-size: 0.7em;
  font-weight: 700;
  vertical-align: super;
  color: var(--color-accent-text);
  background: var(--color-accent-subtle);
  border-radius: 4px;
  padding: 1px 4px;
  border: none;
  font-family: var(--font-mono);
  transition: all 0.15s ease;
  line-height: 1;
}
.source-ref:hover {
  background: var(--color-accent);
  color: white;
  transform: scale(1.1);
}

.source-ref-muted {
  display: inline;
  font-size: 0.7em;
  font-weight: 600;
  vertical-align: super;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  line-height: 1;
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--color-accent);
  border-radius: 1px;
  vertical-align: text-bottom;
  margin-left: 2px;
  animation: cursor-blink 1s ease-in-out infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
