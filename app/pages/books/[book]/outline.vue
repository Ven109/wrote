<script setup lang="ts">
const bookId = useRouteBookId()
const view = useOutlineView(bookId)
const { outline, status, mode, board, beats, promptOpen, deleteOpen, promptTitle, deleteTitle, promptInitial } = view
const { dragging, drop } = board
useSeoMeta({ title: 'Outline' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 sm:p-6">
    <BasePageHeader
      title="Outline"
      description="Acts and beats of the story. Stored in outline.md."
    >
      <template #actions>
        <UFieldGroup>
          <UButton
            label="Board"
            icon="i-lucide-columns-3"
            color="neutral"
            :variant="mode === 'board' ? 'soft' : 'ghost'"
            :aria-pressed="mode === 'board'"
            class="min-h-11 lg:min-h-0"
            @click="mode = 'board'"
          />
          <UButton
            label="Tree"
            icon="i-lucide-list-tree"
            color="neutral"
            :variant="mode === 'tree' ? 'soft' : 'ghost'"
            :aria-pressed="mode === 'tree'"
            class="min-h-11 lg:min-h-0"
            @click="mode = 'tree'"
          />
        </UFieldGroup>
        <UButton
          label="Add act"
          icon="i-lucide-plus"
          class="min-h-11 lg:min-h-0"
          @click="view.addAct"
        />
      </template>
    </BasePageHeader>

    <UTextarea
      :model-value="outline.notes"
      placeholder="Notes: premise, themes, open questions…"
      aria-label="Outline notes"
      autoresize
      :rows="2"
      class="w-full"
      @change="(event: Event) => view.saveNotes((event.target as HTMLTextAreaElement).value)"
    />

    <USkeleton
      v-if="status === 'pending'"
      class="h-64 w-full"
    />
    <BaseEmptyState
      v-else-if="!outline.acts.length"
      icon="i-lucide-columns-3"
      title="No acts yet"
      description="Add an act, then the beats of your story."
    />
    <OutlineBoard
      v-else-if="mode === 'board'"
      :outline="outline"
      :drag-enabled="view.dragEnabled.value"
      :dragging="dragging"
      :drop="drop"
      :card-handlers="board.card"
      :column-handlers="board.column"
      :act-menu="view.actMenu"
      :beat-menu="view.beatMenu"
      @open="view.edit"
      @add-beat="view.addBeat"
    />
    <OutlineTree
      v-else
      :outline="outline"
      :act-menu="view.actMenu"
      :beat-menu="view.beatMenu"
      @open="view.edit"
    />

    <BasePromptModal
      v-model:open="promptOpen"
      :title="promptTitle"
      label="Title"
      :initial-value="promptInitial"
      :submit-label="promptInitial ? 'Rename' : 'Add'"
      @submit="view.submitTitle"
    />
    <BaseConfirmModal
      v-model:open="deleteOpen"
      :title="deleteTitle"
      confirm-label="Delete"
      danger
      @confirm="view.confirmDelete"
    />
    <OutlineBeatSheet
      v-model="beats.editing.value"
      :scenes="beats.scenes.value"
      :chapters="beats.chapters.value"
      :creating="beats.creating.value"
      :created="beats.created.value"
      @save="beats.save"
      @create-scene="beats.createScene"
    />
  </div>
</template>
