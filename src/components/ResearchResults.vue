<script setup lang="ts">
import { watch, nextTick, ref } from "vue";
import { useConvexQuery } from "convex-vue";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ResearchProcess from "./ResearchProcess.vue";
import ResearchAnswer from "./ResearchAnswer.vue";

const props = defineProps<{
  sessionId: Id<"researchSessions">;
}>();

const emit = defineEmits<{
  reset: [];
}>();

const bottomEl = ref<HTMLElement | null>(null);

const { data: session } = useConvexQuery(api.researchSessions.get, {
  sessionId: props.sessionId,
});

watch(session, () => {
  nextTick(() => {
    bottomEl.value?.scrollIntoView({ behavior: "smooth", block: "end" });
  });
});
</script>

<template>
  <div v-if="session" class="animate-fade-in">
    <!-- Query -->
    <div class="mb-6 flex items-start gap-3">
      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="text-[var(--color-accent)]">
          <path d="M8 3v10M5 6l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">Research Query</p>
        <p class="mt-0.5 text-base font-medium leading-snug text-[var(--color-text-primary)]">
          {{ session.question }}
        </p>
      </div>
    </div>

    <!-- Process log -->
    <ResearchProcess :session="session" />

    <!-- Answer -->
    <ResearchAnswer
      v-if="session.status === 'complete' || session.status === 'synthesizing'"
      :session="session"
    />

    <!-- Error -->
    <div
      v-if="session.status === 'error'"
      class="mt-4 rounded-lg bg-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error-text)]"
    >
      Research encountered an error. Please try again.
    </div>

    <!-- Footer -->
    <div ref="bottomEl" class="mt-8 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
      <button
        @click="emit('reset')"
        class="text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
      >
        &larr; New research
      </button>
      <p class="text-[11px] text-[var(--color-text-tertiary)]">
        AI-generated. Verify with source documents.
      </p>
    </div>
  </div>
</template>
