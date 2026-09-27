<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { WIKI_LINK_CONTEXT } from '~/editor/wiki-link-context'

const props = defineProps(nodeViewProps)
const context = inject(WIKI_LINK_CONTEXT, null)
const target = computed(() => String(props.node.attrs.target ?? ''))
const label = computed(() => (props.node.attrs.label as string | null) ?? target.value)
const state = computed(() => context?.resolve(target.value) ?? { title: null, href: null, broken: false })
const hint = computed(() => (state.value.broken ? `“${target.value}” does not exist yet – click to create a note` : `Open ${state.value.title ?? target.value}`))

function follow(event: MouseEvent) {
  event.preventDefault()
  context?.open(target.value, { newTab: event.metaKey || event.ctrlKey })
}
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="wiki-link-view"
  >
    <a
      :href="state.href ?? undefined"
      class="wiki-link"
      :class="{ 'wiki-link--broken': state.broken }"
      :title="hint"
      :aria-label="hint"
      data-type="wiki-link"
      :data-target="target"
      contenteditable="false"
      @click="follow"
    >{{ label }}</a>
  </NodeViewWrapper>
</template>
