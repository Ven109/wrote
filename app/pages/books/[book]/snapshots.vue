<script setup lang="ts">
const bookId = useRouteBookId()
const route = useRoute()
const path = computed(() => (typeof route.query.path === 'string' ? route.query.path : ''))
const snapshots = useSnapshots(bookId, path)
const { snapshots: list, selected, selectedId, scopes } = snapshots
const diff = useSnapshotDiff(bookId, selectedId)
const taking = ref(false)
useSeoMeta({ title: 'Snapshots' })
</script>

<template>
  <BaseSplitView
    :detail-active="Boolean(selected)"
    list-label="Snapshots"
  >
    <template #list>
      <p
        v-if="path"
        class="mb-3 text-xs text-muted"
      >
        Showing snapshots of <span class="font-mono">{{ path.split('/').at(-1) }}</span> ·
        <NuxtLink
          :to="`/books/${bookId}/snapshots`"
          class="underline"
        >all</NuxtLink>
      </p>
      <SnapshotsList
        :snapshots="list"
        :selected-id="selectedId"
        @select="selectedId = $event"
        @take="taking = true"
      />
    </template>
    <SnapshotsDetail
      v-if="selected"
      v-model:mode="diff.mode.value"
      :snapshot="selected"
      :files="diff.files.value"
      :loading="diff.isPending.value"
      :busy="diff.busy.value"
      @restore-all="diff.restoreAll"
      @restore-file="diff.restoreFile"
      @restore-block="diff.restoreBlock"
      @remove="snapshots.remove(selected.id)"
      @back="selectedId = null"
    />
    <BaseEmptyState
      v-else
      icon="i-lucide-camera"
      title="Pick a snapshot"
      description="Compare it with the current text and restore all of it, one file or single paragraphs."
      class="m-6 hidden lg:flex"
    />
    <SnapshotsTakeModal
      v-model:open="taking"
      :scopes="scopes"
      @submit="snapshots.take"
    />
  </BaseSplitView>
</template>
