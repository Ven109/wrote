<script setup lang="ts">
import { wroteExtensions } from '~/editor/extensions'
import { WikiLinkView } from '~/editor/extensions/wiki-link-view'
import { MARKDOWN_OPTIONS } from '~/editor/markdown'
import { SLASH_ITEMS } from '~/editor/menus'
import { WIKI_LINK_CONTEXT, wikiLinkHandlers } from '~/editor/wiki-link-context'
import { CODEX_MENTIONS_CONTEXT } from '~/editor/codex-mentions-context'

withDefaults(defineProps<{ placeholder?: string }>(), { placeholder: 'Write, or press / for blocks…' })
const markdown = defineModel<string>({ required: true })
const { mode } = useEditorMode()
const links = inject(WIKI_LINK_CONTEXT, null)
const codex = inject(CODEX_MENTIONS_CONTEXT, null)
const extensions = wroteExtensions({ wikiLink: WikiLinkView })
</script>

<template>
  <UEditor
    v-slot="{ editor, handlers }"
    v-model="markdown"
    content-type="markdown"
    :markdown="MARKDOWN_OPTIONS"
    :mention="false"
    :extensions="extensions"
    :handlers="wikiLinkHandlers"
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
    <UEditorSuggestionMenu
      v-if="links"
      :editor="editor"
      :items="links.pickerItems.value"
      char="[["
      plugin-key="wikiLinkMenu"
      :limit="12"
    />
    <UEditorSuggestionMenu
      v-if="codex"
      :editor="editor"
      :items="codex.menuItems.value"
      char="@"
      plugin-key="codexMentionMenu"
      :filter-fields="['label', 'description']"
      :limit="10"
    />
    <EditorCodexMentions
      v-if="codex"
      :editor="editor"
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
