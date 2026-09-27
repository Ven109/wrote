<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { setProvenanceRanges } from '~/editor/extensions/provenance-marks'
import { PROVENANCE_CONTEXT } from '~/editor/provenance-context'

/** Feeds the highlighted AI-assisted passages into the editor. */
const props = defineProps<{ editor: Editor }>()
const context = inject(PROVENANCE_CONTEXT, null)
watch(() => context?.shown.value ?? [], (ranges) => {
  props.editor.view.dispatch(setProvenanceRanges(props.editor.state, ranges))
}, { immediate: true })
</script>

<template>
  <span hidden />
</template>
