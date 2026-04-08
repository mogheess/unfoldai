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
const expandedSource = ref<number | null>(null);

const isComplete = computed(() => props.session.status === "complete");

function toggleSource(idx: number) {
  expandedSource.value = expandedSource.value === idx ? null : idx;
}
</script>

<template>
  <div class="animate-fade-in-up mt-6">
    <!-- Answer -->
    <div
      class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden"
    >
      <div class="p-5 border-b border-[var(--color-border)]">
        <div class="flex items-center gap-2 mb-3">
          <div
            class="w-5 h-5 rounded-md bg-[var(--color-text-primary)] flex items-center justify-center"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              class="text-[var(--color-surface)]"
            >
              <path
                d="M1 5h8M5 1v8"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <span
            class="text-[10px] uppercase tracking-[0.15em] font-medium text-[var(--color-text-tertiary)]"
          >
            Synthesized Answer
          </span>
        </div>

        <div v-if="!isComplete" class="flex items-center gap-3 py-4">
          <div
            class="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"
          />
          <span class="text-sm text-[var(--color-text-secondary)]">
            Synthesizing findings into a comprehensive answer...
          </span>
        </div>

        <div
          v-else-if="session.answer"
          class="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap max-w-[65ch]"
        >
          {{ session.answer }}
        </div>
      </div>

      <!-- Sources -->
      <div
        v-if="session.sources && session.sources.length > 0"
        class="bg-[var(--color-canvas)]"
      >
        <div
          class="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between"
        >
          <span
            class="text-[10px] uppercase tracking-[0.15em] font-medium text-[var(--color-text-tertiary)]"
          >
            Sources
          </span>
          <span
            class="text-[10px] font-mono text-[var(--color-text-tertiary)]"
          >
            {{ session.sources.length }} referenced
          </span>
        </div>

        <div class="divide-y divide-[var(--color-border)]">
          <div
            v-for="(source, idx) in session.sources"
            :key="idx"
            class="animate-fade-in-up"
            :style="{ animationDelay: `${idx * 80}ms` }"
          >
            <button
              @click="toggleSource(idx)"
              class="w-full text-left px-5 py-3 flex items-start justify-between gap-4 hover:bg-[var(--color-surface)] transition-colors duration-200"
            >
              <div class="flex items-start gap-3 min-w-0">
                <div
                  class="mt-0.5 w-5 h-5 rounded bg-[var(--color-accent-light)] flex items-center justify-center shrink-0"
                >
                  <span
                    class="text-[10px] font-mono font-medium text-[var(--color-accent-text)]"
                  >
                    {{ idx + 1 }}
                  </span>
                </div>
                <div class="min-w-0">
                  <p
                    class="text-sm font-medium text-[var(--color-text-primary)] truncate"
                  >
                    {{ source.documentName }}
                  </p>
                  <p class="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                    {{ source.relevance }}
                  </p>
                </div>
              </div>

              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                class="text-[var(--color-text-tertiary)] shrink-0 mt-1 transition-transform duration-200"
                :class="{ 'rotate-180': expandedSource === idx }"
              >
                <path
                  d="M3 5l3 3 3-3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <!-- Expanded excerpt -->
            <div
              v-if="expandedSource === idx"
              class="px-5 pb-4 animate-fade-in-up"
            >
              <div
                class="ml-8 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
              >
                <p
                  class="text-[10px] uppercase tracking-[0.1em] font-medium text-[var(--color-text-tertiary)] mb-1.5"
                >
                  Source Excerpt
                </p>
                <p
                  class="text-xs text-[var(--color-text-secondary)] leading-relaxed italic"
                >
                  "{{ source.excerpt }}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
