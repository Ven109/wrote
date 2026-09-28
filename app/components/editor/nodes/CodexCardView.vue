<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { codexListQuery } from '~/queries/codex'

/** A codex entry as a card, always showing its current data; without an entry yet it offers a picker. */
const props = defineProps(nodeViewProps)
const bookId = useRouteBookId()
const { data: entries } = useQuery(() => codexListQuery({ bookId: bookId.value, query: {} }))
const id = computed(() => String(props.node.attrs.id ?? ''))
const entry = computed(() => entries.value?.find(candidate => candidate.id === id.value) ?? null)
const options = computed(() => (entries.value ?? []).map(candidate => ({ label: candidate.title, value: candidate.id, description: candidate.codexType })))
</script>

<template>
  <NodeViewWrapper
    data-type="codex-card"
    :data-id="id"
    class="my-4 not-prose"
    contenteditable="false"
  >
    <div
      class="flex flex-col gap-1 rounded-lg p-4 ring ring-default"
      :class="selected ? 'ring-2 ring-primary' : ''"
    >
      <template v-if="entry">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-book-user"
            class="size-4 text-muted"
          />
          <NuxtLink
            :to="entryHref(bookId, { type: 'codex', path: entry.path })"
            class="font-medium text-highlighted hover:underline"
          >
            {{ entry.title }}
          </NuxtLink>
          <UBadge
            :label="entry.codexType"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </div>
        <p
          v-if="entry.aliases.length"
          class="text-xs text-muted"
        >
          Also: {{ entry.aliases.join(', ') }}
        </p>
        <p class="line-clamp-3 text-sm text-muted">
          {{ entry.excerpt }}
        </p>
      </template>
      <template v-else>
        <p class="text-sm text-muted">
          {{ id ? `Codex entry ${id} not found.` : 'Pick the codex entry to show:' }}
        </p>
        <USelectMenu
          :items="options"
          value-key="value"
          placeholder="Codex entry…"
          aria-label="Codex entry for this card"
          class="w-full sm:w-72"
          @update:model-value="(value: string) => updateAttributes({ id: value })"
        />
      </template>
    </div>
  </NodeViewWrapper>
</template>
