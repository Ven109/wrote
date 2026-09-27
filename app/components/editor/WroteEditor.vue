<script setup lang="ts">
import { wroteExtensions } from '~/editor/extensions'
import { MARKDOWN_OPTIONS } from '~/editor/markdown'
import { SLASH_ITEMS } from '~/editor/menus'

withDefaults(defineProps<{ placeholder?: string }>(), { placeholder: 'Write, or press / for blocks…' })
const markdown = defineModel<string>({ required: true })
const { mode } = useEditorMode()
const extensions = wroteExtensions()
</script>

<template>
  <UEditor
    v-slot="{ editor, handlers }"
    v-model="markdown"
    content-type="markdown"
    :markdown="MARKDOWN_OPTIONS"
    :mention="false"
    :extensions="extensions"
    :placeholder="placeholder"
    :data-mode="mode"
    class="prose-manuscript w-full"
    :class="mode === 'document' ? 'pb-24' : 'lg:ps-8'"
    :ui="{ base: 'min-h-[60vh] text-lg sm:px-0 [&_p]:leading-8' }"
  >
    <UEditorSuggestionMenu
      :editor="editor"
      :items="SLASH_ITEMS"
    />
    <template v-if="mode === 'block'">
      <EditorBlockHandle
        :editor="editor"
        :handlers="handlers"
      />
      <EditorBubbleToolbar :editor="editor" />
    </template>
    <EditorMobileToolbar
      v-else
      :editor="editor"
      :handlers="handlers"
    />
  </UEditor>
</template>
