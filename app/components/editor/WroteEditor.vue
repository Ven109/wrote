<script setup lang="ts">
import { wroteExtensions } from '~/editor/extensions'
import { WikiLinkView } from '~/editor/extensions/wiki-link-view'
import { BLOCK_VIEWS } from '~/editor/extensions/block-views'
import { blockHandlers } from '~/editor/block-handlers'
import { MARKDOWN_OPTIONS } from '~/editor/markdown'
import { SLASH_ITEMS } from '~/editor/menus'
import { WIKI_LINK_CONTEXT, wikiLinkHandlers } from '~/editor/wiki-link-context'
import { CODEX_MENTIONS_CONTEXT } from '~/editor/codex-mentions-context'
import { inlineAiHandlers, SLASH_AI_ITEMS } from '~/editor/ai-actions'
import { INLINE_AI_CONTEXT } from '~/editor/inline-ai-context'

withDefaults(defineProps<{ placeholder?: string }>(), { placeholder: 'Write, or press / for blocks…' })
const markdown = defineModel<string>({ required: true })
const { mode } = useEditorMode()
const links = inject(WIKI_LINK_CONTEXT, null)
const codex = inject(CODEX_MENTIONS_CONTEXT, null)
const extensions = wroteExtensions({ wikiLink: WikiLinkView, blocks: BLOCK_VIEWS })
const ai = inject(INLINE_AI_CONTEXT, null)
const slashItems = ai ? [...SLASH_ITEMS, SLASH_AI_ITEMS] : SLASH_ITEMS
const editorHandlers = ai ? { ...wikiLinkHandlers, ...blockHandlers, ...inlineAiHandlers(ai) } : { ...wikiLinkHandlers, ...blockHandlers }
</script>

<template>
  <UEditor
    v-slot="{ editor, handlers }"
    v-model="markdown"
    content-type="markdown"
    :markdown="MARKDOWN_OPTIONS"
    :mention="false"
    :extensions="extensions"
    :handlers="editorHandlers"
    :placeholder="placeholder"
    :data-mode="mode"
    class="prose-manuscript w-full"
    :class="mode === 'document' ? 'pb-24' : 'lg:ps-8'"
    :ui="{ base: 'min-h-[60vh] text-lg sm:px-0 [&_p]:leading-8' }"
  >
    <UEditorSuggestionMenu
      :editor="editor"
      :items="slashItems"
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
    <EditorSuggestions :editor="editor" />
    <EditorComments :editor="editor" />
    <EditorGhostText :editor="editor" />
    <EditorProvenance :editor="editor" />
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
