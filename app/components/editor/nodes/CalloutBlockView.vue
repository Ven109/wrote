<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { CALLOUT_VARIANTS, type CalloutVariant } from '~/editor/extensions/callout-block'

/** A callout box with its variant (info / tip / warning), switchable from its label. */
const props = defineProps(nodeViewProps)
const variant = computed(() => props.node.attrs.variant as CalloutVariant)
const STYLE: Record<CalloutVariant, { icon: string, label: string, classes: string }> = {
  info: { icon: 'i-lucide-info', label: 'Info', classes: 'border-info bg-info/5 text-info' },
  tip: { icon: 'i-lucide-lightbulb', label: 'Tip', classes: 'border-success bg-success/5 text-success' },
  warning: { icon: 'i-lucide-triangle-alert', label: 'Warning', classes: 'border-warning bg-warning/5 text-warning' },
}
const items = computed(() => CALLOUT_VARIANTS.map(value => ({ label: STYLE[value].label, icon: STYLE[value].icon, onSelect: () => props.updateAttributes({ variant: value }) })))
</script>

<template>
  <NodeViewWrapper
    data-type="callout"
    :data-variant="variant"
    role="note"
    :aria-label="`${STYLE[variant].label} callout`"
    class="my-4 rounded-md border-s-4 px-4 py-2 not-prose"
    :class="STYLE[variant].classes"
  >
    <div
      contenteditable="false"
      class="mb-1 select-none"
    >
      <UDropdownMenu :items="items">
        <UButton
          :icon="STYLE[variant].icon"
          :label="STYLE[variant].label"
          :aria-label="`Callout type: ${STYLE[variant].label}`"
          size="xs"
          color="neutral"
          variant="ghost"
          class="min-h-11 lg:min-h-0"
        />
      </UDropdownMenu>
    </div>
    <NodeViewContent class="text-default" />
  </NodeViewWrapper>
</template>
