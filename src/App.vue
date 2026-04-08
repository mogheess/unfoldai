<script setup lang="ts">
import { ref } from "vue";
import DocumentPanel from "./components/DocumentPanel.vue";
import ResearchView from "./components/ResearchView.vue";

const activeTab = ref<"research" | "documents">("research");
</script>

<template>
  <div class="min-h-[100dvh] bg-[var(--color-canvas)]">
    <!-- Header -->
    <header
      class="border-b border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <div class="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg bg-[var(--color-text-primary)] flex items-center justify-center"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              class="text-[var(--color-surface)]"
            >
              <path
                d="M2 4h12M2 8h8M2 12h10"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <h1 class="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
            Unfold
          </h1>
          <span
            class="text-[10px] uppercase tracking-[0.15em] font-medium text-[var(--color-text-tertiary)] border border-[var(--color-border)] rounded px-1.5 py-0.5"
          >
            Deep Research
          </span>
        </div>

        <nav class="flex gap-1">
          <button
            v-for="tab in (['research', 'documents'] as const)"
            :key="tab"
            @click="activeTab = tab"
            class="px-3 py-1.5 text-sm rounded-md transition-colors duration-200"
            :class="
              activeTab === tab
                ? 'bg-[var(--color-text-primary)] text-[var(--color-surface)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border-subtle)]'
            "
          >
            {{ tab === 'research' ? 'Research' : 'Documents' }}
          </button>
        </nav>
      </div>
    </header>

    <!-- Main -->
    <main class="mx-auto max-w-7xl px-6 py-8">
      <ResearchView v-if="activeTab === 'research'" />
      <DocumentPanel v-else />
    </main>
  </div>
</template>
