import { useLocalStorage } from '@vueuse/core'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Act, Beat } from '#shared/schemas/outline'
import { stepMove, type BeatDirection } from '~/utils/outline-board'

export type OutlineViewMode = 'board' | 'tree'
type Dialog
  = | { kind: 'addAct' }
    | { kind: 'renameAct', act: Act }
    | { kind: 'addBeat', act: Act }
    | { kind: 'deleteAct', act: Act }
    | { kind: 'deleteBeat', beat: Beat }

const MOVES: [BeatDirection, string, string][] = [
  ['up', 'Move up', 'i-lucide-arrow-up'],
  ['down', 'Move down', 'i-lucide-arrow-down'],
  ['previousAct', 'Move to previous act', 'i-lucide-arrow-left'],
  ['nextAct', 'Move to next act', 'i-lucide-arrow-right'],
]

/** The outline page: board/tree toggle, add/rename/delete dialogs, card and act menus, beat editor, templates. */
export function useOutlineView(bookId: MaybeRefOrGetter<string>) {
  const data = useOutline(bookId)
  const { outline, apply } = data
  const { isCoarsePointer } = useBreakpoint()
  const mode = useLocalStorage<OutlineViewMode>('wrote:outline-view', 'board')
  const board = useOutlineBoard(outline, op => apply(op))
  const dialog = ref<Dialog | null>(null)
  const beats = useBeatEditor(bookId, apply)
  const templates = useBeatSheetPicker(outline, apply)
  const { edit } = beats

  const actMenu = (act: Act): DropdownMenuItem[][] => [
    [
      { label: 'Add beat', icon: 'i-lucide-plus', onSelect: () => (dialog.value = { kind: 'addBeat', act }) },
      { label: 'Rename act', icon: 'i-lucide-pencil', onSelect: () => (dialog.value = { kind: 'renameAct', act }) },
    ],
    [{ label: 'Delete act', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => (dialog.value = { kind: 'deleteAct', act }) }],
  ]

  const beatMenu = (beat: Beat): DropdownMenuItem[][] => [
    [{ label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => edit(beat) }],
    MOVES.map(([direction, label, icon]) => {
      const op = stepMove(outline.value, beat.id, direction)
      return { label, icon, disabled: !op, onSelect: () => op && apply(op) }
    }),
    [{ label: 'Delete beat', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => (dialog.value = { kind: 'deleteBeat', beat }) }],
  ]

  /** Title submitted in the add/rename prompt. */
  function submitTitle(title: string) {
    const current = dialog.value
    dialog.value = null
    if (current?.kind === 'addAct') void apply({ op: 'addAct', title })
    else if (current?.kind === 'renameAct') void apply({ op: 'renameAct', actId: current.act.id, title })
    else if (current?.kind === 'addBeat') void apply({ op: 'addBeat', actId: current.act.id, title, summary: '' })
  }

  function confirmDelete() {
    const current = dialog.value
    dialog.value = null
    if (current?.kind === 'deleteAct') void apply({ op: 'deleteAct', actId: current.act.id })
    else if (current?.kind === 'deleteBeat') void apply({ op: 'deleteBeat', beatId: current.beat.id })
  }

  const close = (open: boolean) => !open && (dialog.value = null)
  const kind = () => dialog.value?.kind ?? ''
  const promptOpen = computed({ get: () => ['addAct', 'renameAct', 'addBeat'].includes(kind()), set: close })
  const deleteOpen = computed({ get: () => ['deleteAct', 'deleteBeat'].includes(kind()), set: close })
  const promptTitle = computed(() => ({ addAct: 'New act', renameAct: 'Rename act', addBeat: 'New beat' } as Record<string, string>)[kind()] ?? '')
  const deleteTitle = computed(() => {
    const current = dialog.value
    if (current?.kind === 'deleteAct') return `Delete the act “${current.act.title}” and its beats?`
    return current?.kind === 'deleteBeat' ? `Delete the beat “${current.beat.title}”?` : ''
  })

  return {
    ...data,
    promptOpen,
    deleteOpen,
    promptTitle,
    deleteTitle,
    promptInitial: computed(() => (dialog.value?.kind === 'renameAct' ? dialog.value.act.title : '')),
    addAct: () => (dialog.value = { kind: 'addAct' }),
    addBeat: (act: Act) => (dialog.value = { kind: 'addBeat', act }),
    mode,
    board,
    dragEnabled: computed(() => !isCoarsePointer.value),
    dialog,
    beats,
    templates,
    actMenu,
    beatMenu,
    edit,
    submitTitle,
    confirmDelete,
    saveNotes: (notes: string) => notes !== outline.value.notes && apply({ op: 'setNotes', notes }),
  }
}
