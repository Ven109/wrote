<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { CODEX_MENTIONS_CONTEXT } from '~/editor/codex-mentions-context'
import { setCodexMatcher } from '~/editor/extensions/codex-mentions'

const props = defineProps<{ editor: Editor }>()
const context = inject(CODEX_MENTIONS_CONTEXT, null)
const bridge = useEditorBridge(() => props.editor)
const card = useCodexHoverCard(bridge.dom, id => context?.target(id))

// Feed (or clear) the names to detect whenever the codex changes.
watch(() => context?.matcher.value ?? null, (matcher) => {
  bridge.dispatch(state => setCodexMatcher(state, matcher))
}, { immediate: true })
</script>

<template>
  <UPopover
    v-if="context"
    :open="card.open.value"
    :reference="card.anchor.value ?? undefined"
    :content="{ side: 'top', align: 'start', onOpenAutoFocus: (e: Event) => e.preventDefault() }"
    @update:open="card.open.value = $event"
  >
    <template #content>
      <div
        v-if="card.target.value"
        class="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 p-3"
        role="dialog"
        :aria-label="card.target.value.title"
        @mouseenter="card.keepOpen"
        @mouseleave="card.scheduleClose"
      >
        <div class="flex items-center gap-2">
          <UIcon
            :name="context.icon(card.target.value.codexType)"
            class="size-4 text-muted"
          />
          <span class="min-w-0 flex-1 truncate font-medium text-highlighted">{{ card.target.value.title }}</span>
          <UBadge
            :label="context.typeLabel(card.target.value.codexType)"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </div>
        <p
          v-if="card.target.value.names.length > 1"
          class="text-xs text-muted"
        >
          Also: {{ card.target.value.names.slice(1).join(' · ') }}
        </p>
        <dl
          v-if="card.target.value.facts.length"
          class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs"
        >
          <template
            v-for="fact in card.target.value.facts"
            :key="fact.label"
          >
            <dt class="text-muted">
              {{ fact.label }}
            </dt>
            <dd>{{ fact.value }}</dd>
          </template>
        </dl>
        <p
          v-if="card.target.value.excerpt"
          class="line-clamp-3 text-xs text-dimmed"
        >
          {{ card.target.value.excerpt }}
        </p>
        <UButton
          :to="context.href(card.target.value)"
          label="Open entry"
          icon="i-lucide-arrow-up-right"
          size="xs"
          color="neutral"
          variant="soft"
          class="self-start"
        />
      </div>
    </template>
  </UPopover>
</template>
