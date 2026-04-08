<script setup lang="ts">
import { ref, computed } from "vue";
import { useConvexQuery, useConvexMutation, useConvexClient } from "convex-vue";
import { api } from "../../convex/_generated/api";

const client = useConvexClient();
const { data: documents } = useConvexQuery(api.documents.list, {});
const createDoc = useConvexMutation(api.documents.create);
const removeDoc = useConvexMutation(api.documents.remove);
const generateUploadUrl = useConvexMutation(api.documents.generateUploadUrl);

const isDragging = ref(false);
const isUploading = ref(false);
const uploadError = ref<string | null>(null);

const sortedDocs = computed(() => {
  if (!documents.value) return [];
  return [...documents.value].sort((a, b) => b.createdAt - a.createdAt);
});

const statusConfig: Record<string, { label: string; classes: string }> = {
  uploading: {
    label: "Uploading",
    classes: "bg-[var(--color-warning)] text-[var(--color-warning-text)]",
  },
  processing: {
    label: "Processing",
    classes: "bg-[var(--color-accent-light)] text-[var(--color-accent-text)]",
  },
  ready: {
    label: "Ready",
    classes: "bg-[var(--color-success)] text-[var(--color-success-text)]",
  },
  error: {
    label: "Error",
    classes: "bg-[var(--color-error)] text-[var(--color-error-text)]",
  },
};

async function handleFiles(files: FileList | null) {
  if (!files) return;
  uploadError.value = null;
  isUploading.value = true;

  try {
    for (const file of Array.from(files)) {
      if (file.type === "application/pdf") {
        await uploadPdf(file);
      } else if (
        file.type === "text/plain" ||
        file.type === "text/markdown" ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".txt")
      ) {
        await uploadText(file);
      } else {
        uploadError.value = `Unsupported file type: ${file.name}. Use PDF, TXT, or MD files.`;
      }
    }
  } catch (err) {
    uploadError.value =
      err instanceof Error ? err.message : "Upload failed. Please try again.";
  } finally {
    isUploading.value = false;
  }
}

async function uploadText(file: File) {
  const content = await file.text();
  const docId = await createDoc.mutate({
    name: file.name,
    content,
  });

  await client.action(api.ingest.processDocument, {
    documentId: docId,
    content,
    documentName: file.name,
  });
}

async function uploadPdf(file: File) {
  const uploadUrl = await generateUploadUrl.mutate({});
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const { storageId } = await response.json();

  const content = await client.action(api.ingest.parsePdf, { storageId });

  const docId = await createDoc.mutate({
    name: file.name,
    content,
    storageId,
  });

  await client.action(api.ingest.processDocument, {
    documentId: docId,
    content,
    documentName: file.name,
  });
}

async function handleDelete(documentId: string) {
  await removeDoc.mutate({ documentId: documentId as any });
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
  handleFiles(e.dataTransfer?.files ?? null);
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}
</script>

<template>
  <div class="animate-fade-in-up">
    <div class="flex items-end justify-between mb-8">
      <div>
        <h2
          class="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]"
        >
          Knowledge Base
        </h2>
        <p class="mt-1 text-sm text-[var(--color-text-secondary)] max-w-[50ch]">
          Upload documents to build your knowledge base. Unfold will chunk,
          embed, and index them for deep research.
        </p>
      </div>
      <span
        v-if="sortedDocs.length > 0"
        class="text-xs font-mono text-[var(--color-text-tertiary)]"
      >
        {{ sortedDocs.length }} document{{ sortedDocs.length !== 1 ? "s" : "" }}
      </span>
    </div>

    <!-- Upload Zone -->
    <label
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      class="block border border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 mb-8"
      :class="
        isDragging
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] scale-[1.005]'
          : 'border-[var(--color-border)] hover:border-[var(--color-text-tertiary)] bg-[var(--color-surface)]'
      "
    >
      <input
        type="file"
        multiple
        accept=".pdf,.txt,.md"
        class="hidden"
        @change="handleFiles(($event.target as HTMLInputElement).files)"
        :disabled="isUploading"
      />

      <div v-if="isUploading" class="flex flex-col items-center gap-3">
        <div
          class="w-10 h-10 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"
        />
        <p class="text-sm text-[var(--color-text-secondary)]">
          Processing documents...
        </p>
      </div>

      <div v-else class="flex flex-col items-center gap-3">
        <div
          class="w-12 h-12 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-center"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            class="text-[var(--color-text-tertiary)]"
          >
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-[var(--color-text-primary)]">
            Drop files here or click to upload
          </p>
          <p class="text-xs text-[var(--color-text-tertiary)] mt-1">
            PDF, TXT, or Markdown -- max 10MB per file
          </p>
        </div>
      </div>
    </label>

    <!-- Error -->
    <div
      v-if="uploadError"
      class="mb-6 p-3 rounded-lg bg-[var(--color-error)] text-[var(--color-error-text)] text-sm flex items-center justify-between"
    >
      <span>{{ uploadError }}</span>
      <button
        @click="uploadError = null"
        class="text-[var(--color-error-text)] hover:opacity-70 transition-opacity ml-4"
      >
        Dismiss
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="sortedDocs.length === 0 && !isUploading"
      class="text-center py-16"
    >
      <p class="text-sm text-[var(--color-text-tertiary)]">
        No documents yet. Upload files to get started.
      </p>
    </div>

    <!-- Document List -->
    <div v-else class="space-y-px">
      <div
        v-for="(doc, index) in sortedDocs"
        :key="doc._id"
        class="animate-fade-in-up group flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] first:rounded-t-xl last:rounded-b-xl transition-colors duration-200 hover:bg-[var(--color-canvas)]"
        :style="{ animationDelay: `${index * 60}ms` }"
      >
        <div class="flex items-center gap-4 min-w-0">
          <div
            class="w-9 h-9 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-center shrink-0"
          >
            <span class="text-[10px] font-mono font-medium text-[var(--color-text-tertiary)] uppercase">
              {{ doc.name.split(".").pop() }}
            </span>
          </div>
          <div class="min-w-0">
            <p
              class="text-sm font-medium text-[var(--color-text-primary)] truncate"
            >
              {{ doc.name }}
            </p>
            <p class="text-xs text-[var(--color-text-tertiary)]">
              {{ doc.chunkCount }} chunks &middot; {{ formatDate(doc.createdAt) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span
            class="text-[10px] uppercase tracking-[0.1em] font-medium px-2 py-0.5 rounded-full"
            :class="statusConfig[doc.status]?.classes"
          >
            {{ statusConfig[doc.status]?.label }}
          </span>
          <button
            @click.stop="handleDelete(doc._id)"
            class="opacity-0 group-hover:opacity-100 text-[var(--color-text-tertiary)] hover:text-[var(--color-error-text)] transition-all duration-200 p-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
