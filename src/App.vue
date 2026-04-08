<script setup lang="ts">
import { ref } from "vue";
import AppSidebar from "./components/AppSidebar.vue";
import DocumentPanel from "./components/DocumentPanel.vue";
import ResearchView from "./components/ResearchView.vue";

const activeView = ref<"research" | "documents">("research");
const sidebarCollapsed = ref(false);
const newResearchKey = ref(0);

function handleNewResearch() {
  activeView.value = "research";
  newResearchKey.value++;
}
</script>

<template>
  <div class="flex h-[100dvh] overflow-hidden bg-[var(--color-canvas)]">
    <AppSidebar
      :collapsed="sidebarCollapsed"
      :active-view="activeView"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @navigate="activeView = $event"
      @new-research="handleNewResearch"
    />

    <main class="relative flex flex-1 flex-col overflow-hidden">
      <ResearchView v-if="activeView === 'research'" :key="newResearchKey" />
      <DocumentPanel v-else />
    </main>
  </div>
</template>
