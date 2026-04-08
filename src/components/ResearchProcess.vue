<script setup lang="ts">
import { computed } from "vue";

interface SubQuery {
  subQuery: string;
  rationale: string;
  status: "pending" | "searching" | "found" | "insufficient";
}

interface Session {
  status: string;
  plan?: SubQuery[];
  findings?: Array<{
    subQuery: string;
    passages: Array<{
      content: string;
      documentName: string;
      score: number;
    }>;
    validated: boolean;
  }>;
}

const props = defineProps<{ session: Session }>();

const stages = computed(() => {
  const s = props.session.status;
  const stageOrder = [
    "planning",
    "searching",
    "validating",
    "synthesizing",
    "complete",
  ];
  const currentIdx = stageOrder.indexOf(s);

  return [
    {
      key: "planning",
      label: "Research Plan",
      description: "Breaking question into targeted sub-queries",
      active: s === "planning",
      done: currentIdx > 0,
    },
    {
      key: "searching",
      label: "Document Search",
      description: "Semantic search across knowledge base",
      active: s === "searching",
      done: currentIdx > 1,
    },
    {
      key: "validating",
      label: "Quality Control",
      description: "Verifying passage relevance and sufficiency",
      active: s === "validating",
      done: currentIdx > 2,
    },
    {
      key: "synthesizing",
      label: "Synthesis",
      description: "Combining findings into a comprehensive answer",
      active: s === "synthesizing",
      done: currentIdx > 3,
    },
  ];
});

const subQueryStatusConfig: Record<
  string,
  { icon: string; classes: string }
> = {
  pending: {
    icon: "circle",
    classes: "text-[var(--color-text-tertiary)]",
  },
  searching: {
    icon: "spinner",
    classes: "text-[var(--color-accent-text)]",
  },
  found: {
    icon: "check",
    classes: "text-[var(--color-success-text)]",
  },
  insufficient: {
    icon: "warning",
    classes: "text-[var(--color-warning-text)]",
  },
};
</script>

<template>
  <div class="space-y-1 mb-6">
    <div
      v-for="(stage, i) in stages"
      :key="stage.key"
      class="animate-fade-in-up overflow-hidden"
      :style="{ animationDelay: `${i * 80}ms` }"
    >
      <!-- Stage header -->
      <div
        class="flex items-center gap-3 p-3 rounded-lg transition-colors duration-300"
        :class="
          stage.active
            ? 'bg-[var(--color-accent-light)]'
            : stage.done
              ? 'bg-[var(--color-surface)]'
              : 'bg-transparent'
        "
      >
        <!-- Status indicator -->
        <div class="relative w-5 h-5 shrink-0 flex items-center justify-center">
          <template v-if="stage.done">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              class="text-[var(--color-success-text)]"
            >
              <path
                d="M4 8l3 3 5-6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </template>
          <template v-else-if="stage.active">
            <div
              class="w-3 h-3 border-2 border-[var(--color-accent-text)] border-t-transparent rounded-full animate-spin"
            />
          </template>
          <template v-else>
            <div
              class="w-2 h-2 rounded-full bg-[var(--color-border)]"
            />
          </template>
        </div>

        <div class="min-w-0">
          <p
            class="text-sm font-medium"
            :class="
              stage.active
                ? 'text-[var(--color-accent-text)]'
                : stage.done
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-tertiary)]'
            "
          >
            {{ stage.label }}
          </p>
          <p
            v-if="stage.active || stage.done"
            class="text-xs text-[var(--color-text-tertiary)]"
          >
            {{ stage.description }}
          </p>
        </div>
      </div>

      <!-- Sub-queries (when plan exists and we're at or past planning) -->
      <div
        v-if="
          (stage.key === 'searching' || stage.key === 'planning') &&
          (stage.active || stage.done) &&
          session.plan
        "
        class="ml-8 mt-1 mb-2 space-y-1"
      >
        <div
          v-for="(sq, idx) in session.plan"
          :key="idx"
          class="animate-fade-in-up flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
          :style="{ animationDelay: `${idx * 60}ms` }"
        >
          <!-- Sub-query status icon -->
          <div class="mt-0.5 shrink-0">
            <template v-if="sq.status === 'searching'">
              <div
                class="w-3 h-3 border-[1.5px] border-[var(--color-accent-text)] border-t-transparent rounded-full animate-spin"
              />
            </template>
            <template v-else-if="sq.status === 'found'">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                class="text-[var(--color-success-text)]"
              >
                <path
                  d="M3 6l2 2 4-4.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </template>
            <template v-else-if="sq.status === 'insufficient'">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                class="text-[var(--color-warning-text)]"
              >
                <path
                  d="M6 3v4M6 8.5v.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </template>
            <template v-else>
              <div
                class="w-2 h-2 mt-0.5 rounded-full bg-[var(--color-border)]"
              />
            </template>
          </div>

          <div class="min-w-0">
            <p
              class="text-xs font-medium"
              :class="subQueryStatusConfig[sq.status]?.classes"
            >
              {{ sq.subQuery }}
            </p>
            <p class="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
              {{ sq.rationale }}
            </p>
          </div>
        </div>
      </div>

      <!-- Validation results -->
      <div
        v-if="
          stage.key === 'validating' &&
          (stage.active || stage.done) &&
          session.findings
        "
        class="ml-8 mt-1 mb-2 space-y-1"
      >
        <div
          v-for="(finding, idx) in session.findings"
          :key="idx"
          class="animate-fade-in-up flex items-center gap-2.5 p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
          :style="{ animationDelay: `${idx * 60}ms` }"
        >
          <svg
            v-if="finding.validated"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            class="text-[var(--color-success-text)] shrink-0"
          >
            <path
              d="M3 6l2 2 4-4.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg
            v-else
            width="12"
            height="12"
            viewBox="0 0 12 12"
            class="text-[var(--color-warning-text)] shrink-0"
          >
            <path
              d="M6 3v4M6 8.5v.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span class="text-xs text-[var(--color-text-secondary)]">
            {{ finding.subQuery }}
            <span class="text-[var(--color-text-tertiary)]">
              -- {{ finding.passages.length }} passage{{
                finding.passages.length !== 1 ? "s" : ""
              }}
              {{ finding.validated ? "verified" : "insufficient" }}
            </span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
