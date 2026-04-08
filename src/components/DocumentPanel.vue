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

const totalChunks = computed(() =>
  sortedDocs.value.reduce((sum, d) => sum + (d.chunkCount || 0), 0)
);

const statusConfig: Record<string, { label: string; dotClass: string; bgClass: string }> = {
  uploading: { label: "Uploading", dotClass: "bg-[var(--color-warning-text)]", bgClass: "bg-[var(--color-warning)] text-[var(--color-warning-text)]" },
  processing: { label: "Processing", dotClass: "bg-[var(--color-accent)]", bgClass: "bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)]" },
  ready: { label: "Indexed", dotClass: "bg-[var(--color-success-text)]", bgClass: "bg-[var(--color-success)] text-[var(--color-success-text)]" },
  error: { label: "Failed", dotClass: "bg-[var(--color-error-text)]", bgClass: "bg-[var(--color-error)] text-[var(--color-error-text)]" },
};

async function handleFiles(files: FileList | null) {
  if (!files) return;
  uploadError.value = null;
  isUploading.value = true;
  try {
    for (const file of Array.from(files)) {
      if (file.type === "application/pdf") await uploadPdf(file);
      else if (file.type === "text/plain" || file.type === "text/markdown" || file.name.endsWith(".md") || file.name.endsWith(".txt")) await uploadText(file);
      else uploadError.value = `Unsupported: ${file.name}. Use PDF, TXT, or MD.`;
    }
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : "Upload failed.";
  } finally {
    isUploading.value = false;
  }
}

async function uploadText(file: File) {
  const content = await file.text();
  const docId = await createDoc.mutate({ name: file.name, content });
  await client.action(api.ingest.processDocument, { documentId: docId, content, documentName: file.name });
}

async function uploadPdf(file: File) {
  const uploadUrl = await generateUploadUrl.mutate({});
  const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
  const { storageId } = await response.json();
  const content = await client.action(api.ingest.parsePdf, { storageId });
  const docId = await createDoc.mutate({ name: file.name, content, storageId });
  await client.action(api.ingest.processDocument, { documentId: docId, content, documentName: file.name });
}

async function handleDelete(documentId: string) {
  await removeDoc.mutate({ documentId: documentId as any });
}

function onDragOver(e: DragEvent) { e.preventDefault(); isDragging.value = true; }
function onDragLeave() { isDragging.value = false; }
function onDrop(e: DragEvent) { e.preventDefault(); isDragging.value = false; handleFiles(e.dataTransfer?.files ?? null); }

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
}
</script>

<template>
  <div
    class="h-full overflow-y-auto px-6 py-10 md:px-8"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="mx-auto max-w-4xl">
      <!-- Title -->
      <div class="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">Knowledge Base</h2>
          <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
            {{ sortedDocs.length > 0 ? `${sortedDocs.length} documents, ${totalChunks} chunks indexed` : 'Upload documents to start researching' }}
          </p>
        </div>

        <!-- Upload button -->
        <label class="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-all hover:bg-[var(--color-surface-sunken)] hover:shadow-sm">
          <input type="file" multiple accept=".pdf,.txt,.md" class="hidden" @change="handleFiles(($event.target as HTMLInputElement).files)" :disabled="isUploading" />
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="text-[var(--color-text-secondary)]">
            <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          {{ isUploading ? 'Uploading...' : 'Upload files' }}
        </label>
      </div>

      <!-- Error -->
      <div v-if="uploadError" class="mb-4 flex items-center justify-between rounded-lg bg-[var(--color-error)] px-4 py-2.5 text-sm text-[var(--color-error-text)]">
        <span>{{ uploadError }}</span>
        <button @click="uploadError = null" class="text-xs font-medium hover:opacity-70">Dismiss</button>
      </div>

      <!-- Drag overlay hint -->
      <div v-if="isDragging" class="mb-4 rounded-xl border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-accent-subtle)] p-8 text-center text-sm font-medium text-[var(--color-accent-text)]">
        Drop files to upload
      </div>

      <!-- Empty state -->
      <div v-if="sortedDocs.length === 0 && !isUploading && !isDragging" class="flex flex-col items-center py-20 text-center">
        <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-sunken)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="text-[var(--color-text-tertiary)]">
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7zM13 2v7h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <p class="text-sm text-[var(--color-text-tertiary)]">No documents yet.</p>
        <p class="text-xs text-[var(--color-text-tertiary)]">Upload PDF, TXT, or Markdown files to build your knowledge base.</p>
      </div>

      <!-- Document table -->
      <div v-else class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div
          v-for="(doc, index) in sortedDocs"
          :key="doc._id"
          class="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[var(--color-surface-sunken)]"
          :class="index !== sortedDocs.length - 1 ? 'border-b border-[var(--color-border)]' : ''"
        >
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-sunken)]">
            <span class="text-[9px] font-mono font-semibold uppercase text-[var(--color-text-tertiary)]">
              {{ doc.name.split(".").pop() }}
            </span>
          </div>

          <div class="flex-1 min-w-0">
            <p class="truncate text-sm font-medium text-[var(--color-text-primary)]">{{ doc.name }}</p>
            <p class="text-xs text-[var(--color-text-tertiary)]">{{ doc.chunkCount || 0 }} chunks &middot; {{ formatDate(doc.createdAt) }}</p>
          </div>

          <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" :class="statusConfig[doc.status]?.bgClass">
            <span class="h-1 w-1 rounded-full" :class="statusConfig[doc.status]?.dotClass"></span>
            {{ statusConfig[doc.status]?.label }}
          </span>

          <button
            @click.stop="handleDelete(doc._id)"
            class="rounded-md p-1.5 text-[var(--color-text-tertiary)] opacity-0 transition-all hover:bg-[var(--color-error)]/50 hover:text-[var(--color-error-text)] group-hover:opacity-100"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
