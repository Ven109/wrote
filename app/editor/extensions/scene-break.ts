import { mergeAttributes, Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sceneBreak: { insertSceneBreak: () => ReturnType }
  }
}

const SCENE_BREAK = /^\* \* \*[ \t]*(?:\n+|$)/

/** A scene break (`* * *`) – distinct from a horizontal rule (`---`), typeset as an ornament on export. */
export const SceneBreak = Node.create({
  name: 'sceneBreak',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="scene-break"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'scene-break', 'class': 'wrote-scene-break', 'role': 'separator', 'aria-label': 'Scene break', 'contenteditable': 'false' }), '* * *']
  },

  markdownTokenizer: {
    name: 'sceneBreak',
    level: 'block',
    start: (src: string) => src.indexOf('* * *'),
    tokenize(src: string) {
      const match = SCENE_BREAK.exec(src)
      return match ? { type: 'sceneBreak', raw: match[0] } : undefined
    },
  },
  parseMarkdown: () => ({ type: 'sceneBreak' }),
  renderMarkdown: () => '* * *',

  addCommands() {
    return {
      insertSceneBreak: () => ({ commands }) => commands.insertContent({ type: this.name }),
    }
  },
})
