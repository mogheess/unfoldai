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

const isComplete = computed(() => props.session.status === "complete");

const renderedAnswer = computed(() => {
  if (!props.session.answer) return "";
  let text = props.session.answer;

  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\n{2,}/g, "</p><p>");
  text = text.replace(/\n- /g, "\n<li>");
  text = text.replace(/<li>(.*?)(?=\n<li>|<\/p>|$)/g, "<li>$1</li>");
  text = text.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

  if (props.session.sources) {
    props.session.sources.forEach((src, i) => {
      const patterns = [
        `[Source: ${src.documentName}]`,
        `[${src.documentName}]`,
      ];
      patterns.forEach((pattern) => {
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        text = text.replace(
          new RegExp(escaped, "g"),
          `<button class="source-ref" data-idx="${i}" onclick="this.dispatchEvent(new CustomEvent('cite',{bubbles:true,detail:${i}}))">[${i + 1}]</button>`
        );
      });
    });
  }

  return `<p>${text}</p>`;
});

function scrollToSource(idx: number) {
  highlightedSource.value = idx;
  const el = document.getElementById(`source-${idx}`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => { highlightedSource.value = null; }, 2000);
}

function handleCite(e: Event) {
  const custom = e as CustomEvent;
  if (custom.detail !== undefined) scrollToSource(custom.detail);
}
</script>

<template>
  <div class="animate-fade-in">
    <!-- Answer card -->
    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3">
        <div class="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--color-text-primary)]">
          <svg width="10" height="10" viewBox="0 0 10 10" class="text-[var(--color-surface)]">
            <path d="M1 5h8M5 1v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <span class="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
          Synthesized Answer
        </span>
      </div>

      <!-- Body -->
      <div class="px-5 py-5">
        <div v-if="!isComplete" class="flex items-center gap-3 py-4">
          <div class="h-4 w-4 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
          <span class="text-sm text-[var(--color-text-secondary)]">Synthesizing findings...</span>
        </div>

        <div
          v-else-if="session.answer"
          class="prose-answer max-w-none text-sm leading-7 text-[var(--color-text-primary)]"
          @cite="handleCite"
          v-html="renderedAnswer"
        />
      </div>
    </div>

    <!-- Sources -->
    <div v-if="session.sources && session.sources.length > 0" class="mt-4">
      <div class="mb-2 flex items-center justify-between px-1">
        <span class="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
          Sources ({{ session.sources.length }})
        </span>
      </div>

      <div class="grid gap-2 md:grid-cols-2">
        <div
          v-for="(source, idx) in session.sources"
          :key="idx"
          :id="`source-${idx}`"
          class="animate-fade-in rounded-lg border bg-[var(--color-surface)] p-3.5 transition-all duration-300"
          :class="highlightedSource === idx ? 'border-[var(--color-accent)] shadow-[0_0_0_2px_var(--color-accent-subtle)]' : 'border-[var(--color-border)]'"
          :style="{ animationDelay: `${idx * 60}ms` }"
        >
          <div class="mb-2 flex items-start gap-2">
            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--color-accent-subtle)] text-[10px] font-mono font-semibold text-[var(--color-accent-text)]">
              {{ idx + 1 }}
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{{ source.documentName }}</p>
              <p class="text-xs text-[var(--color-text-tertiary)]">{{ source.relevance }}</p>
            </div>
          </div>
          <p class="text-xs leading-relaxed text-[var(--color-text-secondary)] italic line-clamp-3">
            "{{ source.excerpt }}"
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.prose-answer p { margin-bottom: 0.75rem; }
.prose-answer p:last-child { margin-bottom: 0; }
.prose-answer strong { font-weight: 600; }
.prose-answer ul { margin: 0.5rem 0; padding-left: 1.25rem; list-style: disc; }
.prose-answer li { margin-bottom: 0.25rem; }
.source-ref {
  display: inline;
  cursor: pointer;
  font-size: 0.7em;
  font-weight: 600;
  vertical-align: super;
  color: var(--color-accent-text);
  background: var(--color-accent-subtle);
  border-radius: 3px;
  padding: 0 3px;
  border: none;
  font-family: var(--font-mono);
  transition: background 0.15s;
}
.source-ref:hover {
  background: var(--color-accent);
  color: white;
}
</style>
