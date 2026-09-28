import type { Editor } from '@tiptap/vue-3'
import type { InjectionKey, ShallowRef } from 'vue'
import type { CommentView } from '#shared/schemas/comments'

/** Provided by the write page: the open entry's comments, the focused one, and the editor they live in. */
export interface CommentsContext {
  comments: Ref<CommentView[]>
  active: Ref<string | null>
  editor: ShallowRef<Editor | null>
  /** Bumped when the editor's layout may have moved passages (edits, resizes): margin cards re-measure. */
  layoutVersion: Ref<number>
  attach: (editor: Editor | null) => void
  focus: (id: string) => void
}

export const COMMENTS_CONTEXT: InjectionKey<CommentsContext> = Symbol('comments')
