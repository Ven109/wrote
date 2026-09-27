import { useQuery } from '@pinia/colada'
import { appendWikiLink } from '#shared/utils/triage'
import { noteTriageQuery } from '~/queries/notes'
import { triageChips, type TriageChip } from '~/utils/triage-chips'

type NoteEditor = ReturnType<typeof useNoteEditor>

/**
 * Inbox triage for the open note: suggested tags, codex links and the chapter it belongs to, as chips.
 * Accepting applies them like the author would (tag via the header, link into the text, file out of the
 * inbox), so it goes through autosave and stays undoable; dismissed chips stay hidden for this note.
 */
export function useNoteTriage(bookId: MaybeRefOrGetter<string>, note: NoteEditor) {
  const path = () => note.entry.document.value?.path ?? ''
  const { data } = useQuery(() => noteTriageQuery({ bookId: toValue(bookId), path: path(), enabled: note.inInbox.value }))
  const dismissed = ref(new Set<string>())
  watch(path, () => (dismissed.value = new Set()))
  const chips = computed(() => (note.inInbox.value ? triageChips(data.value, { tags: note.tags.value, draft: note.entry.draft.value }, dismissed.value) : []))

  function dismiss(chip: TriageChip) {
    dismissed.value = new Set([...dismissed.value, chip.key])
  }

  async function accept(chip: TriageChip) {
    dismiss(chip)
    if (chip.kind === 'tag') return note.setTags([...note.tags.value, chip.value])
    note.entry.draft.value = appendWikiLink(note.entry.draft.value, chip.value)
    if (chip.kind === 'chapter') await note.file()
  }

  return { chips, accept, dismiss }
}
