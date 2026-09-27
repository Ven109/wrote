import { Editor } from '@tiptap/vue-3'
import Image from '@tiptap/extension-image'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { wroteExtensions } from '../../app/editor/extensions'
import { MARKDOWN_OPTIONS } from '../../app/editor/markdown'

/** A DOM-less editor with the same Markdown-relevant extensions as `WroteEditor` (needs a DOM env). */
export function createHeadlessEditor(markdown: string) {
  return new Editor({
    extensions: [Markdown.configure(MARKDOWN_OPTIONS), StarterKit, Image, ...wroteExtensions()],
    content: markdown,
    contentType: 'markdown',
  })
}

/** Markdown → editor document → Markdown. */
export function roundTrip(markdown: string): string {
  const editor = createHeadlessEditor(markdown)
  const output = editor.getMarkdown()
  editor.destroy()
  return output
}
