<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { AUTOCOMPLETE_CONTEXT } from '~/editor/autocomplete-context'

const props = defineProps<{ editor: Editor }>()
useGhostText(() => props.editor, inject(AUTOCOMPLETE_CONTEXT, null))
</script>

<template>
  <span hidden />
</template>
