<script setup lang="ts">
defineProps<{
  collapsed: boolean;
  activeView: "research" | "documents";
}>();

const emit = defineEmits<{
  toggle: [];
  navigate: [view: "research" | "documents"];
  "new-research": [];
}>();

const navItems = [
  {
    id: "research" as const,
    label: "Research",
    icon: "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z",
  },
  {
    id: "documents" as const,
    label: "Documents",
    icon: "M9 12h6M9 16h6M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7zM13 2v7h7",
  },
];
</script>

<template>
  <aside
    class="group/sidebar flex h-full shrink-0 flex-col bg-[var(--color-surface)] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
    :class="collapsed ? 'w-[60px] border-r border-[var(--color-border)]' : 'w-[220px] border-r border-[var(--color-border)]'"
  >
    <!-- Logo -->
    <div class="flex h-14 items-center px-4 shrink-0">
      <button @click="emit('toggle')" class="flex items-center gap-2 rounded-lg p-1 -ml-1 hover:bg-[var(--color-surface-sunken)] transition-colors">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="shrink-0 text-[var(--color-text-primary)]">
          <path d="M4 6h12M4 10h12M4 14h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
      <transition name="fade">
        <span v-if="!collapsed" class="ml-2 text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          Unfold<span class="text-[var(--color-accent)]">.</span>ai
        </span>
      </transition>
    </div>

    <!-- New Research -->
    <div class="px-2.5 mt-1 mb-3 shrink-0">
      <button
        @click="emit('new-research')"
        class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--color-text-primary)] transition-all duration-150 hover:bg-[var(--color-surface-sunken)]"
        :class="collapsed ? 'justify-center' : ''"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="shrink-0">
          <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span v-if="!collapsed">New question...</span>
      </button>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto px-2.5">
      <ul class="space-y-0.5">
        <li v-for="item in navItems" :key="item.id">
          <button
            @click="emit('navigate', item.id)"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150"
            :class="[
              activeView === item.id
                ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]',
              collapsed ? 'justify-center' : '',
            ]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="shrink-0">
              <path :d="item.icon" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span v-if="!collapsed">{{ item.label }}</span>
          </button>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
