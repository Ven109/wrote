<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { setProvenanceRanges } from '~/editor/extensions/provenance-marks'
import { PROVENANCE_CONTEXT } from '~/editor/provenance-context'

/** Feeds the highlighted AI-assisted passages into the editor. */
const props = defineProps<{ editor: Editor }>()
const context = inject(PROVENANCE_CONTEXT, null)
const bridge = useEditorBridge(() => props.editor)
watch(() => context?.shown.value ?? [], (ranges) => {
  bridge.dispatch(state => setProvenanceRanges(state, ranges))
}, { immediate: true })
</script>

<template>
  <span hidden />
</template>
