<script setup lang="ts">
import { computed, ref } from "vue";

interface SubQuery {
  subQuery: string;
  rationale: string;
  status: "pending" | "searching" | "found" | "insufficient";
}

interface Passage {
  content: string;
  documentName: string;
  score: number;
}

interface Finding {
  subQuery: string;
  passages: Passage[];
}

interface Session {
  status: string;
  plan?: SubQuery[];
  findings?: Finding[];
}

const props = defineProps<{ session: Session }>();

const expandedPassages = ref<Record<number, boolean>>({});
function togglePassages(idx: number) {
  expandedPassages.value[idx] = !expandedPassages.value[idx];
}

const stageOrder = ["planning", "searching", "synthesizing", "complete"];

const currentIdx = computed(() => stageOrder.indexOf(props.session.status));

const stages = computed(() => [
  {
    key: "planning",
    label: "Decomposing question",
    doneLabel: "Decomposed into sub-queries",
    active: props.session.status === "planning",
    done: currentIdx.value > 0,
  },
  {
    key: "searching",
    label: "Searching knowledge base",
    doneLabel: "Retrieved relevant passages",
    active: props.session.status === "searching",
    done: currentIdx.value > 1,
  },
  {
    key: "synthesizing",
    label: "Synthesizing answer",
    doneLabel: "Answer synthesized",
    active: props.session.status === "synthesizing",
    done: currentIdx.value > 2,
  },
]);

function scorePercent(score: number) {
  return Math.round(Math.min(score, 1) * 100);
}
</script>

<template>
  <div class="relative mb-8">
    <div class="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--color-border)]"></div>

    <div class="space-y-0">
      <div
        v-for="stage in stages"
        :key="stage.key"
        class="relative pl-10"
      >
        <div class="absolute left-[9px] top-[6px] z-10 flex h-[13px] w-[13px] items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-canvas)]">
          <template v-if="stage.done">
            <div class="h-2.5 w-2.5 rounded-full bg-[var(--color-success-text)]"></div>
          </template>
          <template v-else-if="stage.active">
            <div class="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] animate-pulse"></div>
          </template>
          <template v-else>
            <div class="h-2 w-2 rounded-full bg-[var(--color-border)]"></div>
          </template>
        </div>

        <div class="pb-5">
          <p
            class="text-sm font-medium"
            :class="
              stage.active ? 'text-[var(--color-accent-text)]'
              : stage.done ? 'text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-tertiary)]'
            "
          >
            {{ stage.done ? stage.doneLabel : stage.label }}
            <span v-if="stage.active" class="ml-1.5 inline-block h-1 w-1 rounded-full bg-[var(--color-accent)] animate-pulse align-middle"></span>
          </p>

          <!-- PLAN: sub-query cards -->
          <div
            v-if="stage.key === 'planning' && (stage.active || stage.done) && session.plan"
            class="mt-3 space-y-2"
          >
            <div
              v-for="(sq, qi) in session.plan"
              :key="qi"
              class="animate-fade-in rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              :style="{ animationDelay: `${qi * 60}ms` }"
            >
              <div class="flex items-start gap-2">
                <span class="mt-px shrink-0 rounded bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--color-text-tertiary)]">
                  Q{{ qi + 1 }}
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-[var(--color-text-primary)]">{{ sq.subQuery }}</p>
                  <p class="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{{ sq.rationale }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- SEARCH: sub-queries with passages -->
          <div
            v-if="stage.key === 'searching' && (stage.active || stage.done) && session.plan"
            class="mt-3 space-y-2"
          >
            <div
              v-for="(sq, qi) in session.plan"
              :key="qi"
              class="animate-fade-in rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
              :style="{ animationDelay: `${qi * 60}ms` }"
            >
              <button
                @click="togglePassages(qi)"
                class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--color-surface-sunken)] transition-colors"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div v-if="sq.status === 'searching'" class="h-3 w-3 shrink-0 rounded-full border-[1.5px] border-[var(--color-accent)] border-t-transparent animate-spin" />
                  <svg v-else-if="sq.status === 'found'" width="14" height="14" viewBox="0 0 14 14" class="shrink-0 text-[var(--color-success-text)]">
                    <path d="M4 7l2.5 2.5L10 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <svg v-else-if="sq.status === 'insufficient'" width="14" height="14" viewBox="0 0 14 14" class="shrink-0 text-[var(--color-warning-text)]">
                    <path d="M7 4v4M7 10v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                  </svg>
                  <div v-else class="h-2 w-2 shrink-0 rounded-full bg-[var(--color-border)]" />

                  <p class="truncate text-sm text-[var(--color-text-primary)]">{{ sq.subQuery }}</p>
                </div>

                <div class="flex shrink-0 items-center gap-1.5">
                  <span
                    v-if="session.findings && session.findings[qi]"
                    class="text-[11px] text-[var(--color-text-tertiary)]"
                  >
                    {{ session.findings[qi].passages.length }} passages
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" class="text-[var(--color-text-tertiary)] transition-transform duration-200" :class="expandedPassages[qi] ? 'rotate-180' : ''">
                    <path d="M3 5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
              </button>

              <div
                v-if="expandedPassages[qi] && session.findings && session.findings[qi]"
                class="border-t border-[var(--color-border)] bg-[var(--color-canvas)]"
              >
                <div
                  v-for="(p, pi) in session.findings[qi].passages"
                  :key="pi"
                  class="flex gap-3 border-b border-[var(--color-border)] px-3 py-2.5 last:border-b-0"
                >
                  <div class="shrink-0 pt-0.5">
                    <div class="h-1.5 w-8 rounded-full bg-[var(--color-border)] overflow-hidden">
                      <div
                        class="h-full rounded-full bg-[var(--color-success-text)]"
                        :style="{ width: `${scorePercent(p.score)}%` }"
                      ></div>
                    </div>
                    <p class="mt-0.5 text-center text-[9px] font-mono text-[var(--color-text-tertiary)]">{{ scorePercent(p.score) }}%</p>
                  </div>
                  <div class="min-w-0">
                    <p class="text-[11px] font-medium text-[var(--color-accent-text)]">{{ p.documentName }}</p>
                    <p class="mt-0.5 text-xs leading-relaxed text-[var(--color-text-secondary)] line-clamp-3">{{ p.content }}</p>
                  </div>
                </div>

                <div v-if="session.findings[qi].passages.length === 0" class="px-3 py-3 text-xs text-[var(--color-text-tertiary)] text-center">
                  No passages retrieved
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
