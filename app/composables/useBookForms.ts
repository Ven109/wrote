import type { FormSubmitEvent } from '@nuxt/ui'
import type { z } from 'zod'
import { CreateBookSchema, OpenFolderSchema } from '#shared/schemas/library'

/** State and submit handler for the "new book" form. Navigates into the first scene on success. */
export function useCreateBookForm(onDone?: () => void) {
  const { createBook } = useBooks()
  const toast = useToast()
  const state = reactive<z.input<typeof CreateBookSchema>>({ title: '', author: '', language: 'en', template: 'novel' })
  const pending = ref(false)

  async function submit(event: FormSubmitEvent<z.output<typeof CreateBookSchema>>) {
    pending.value = true
    try {
      const { book, firstScenePath } = await createBook(event.data)
      onDone?.()
      await navigateTo(writeRoute(book.id, firstScenePath))
    }
    catch (error) {
      toast.add({ title: 'Could not create book', description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      pending.value = false
    }
  }

  return { schema: CreateBookSchema, state, pending, submit }
}

/** State and submit handler for "open folder as book". */
export function useOpenFolderForm(onDone?: () => void) {
  const { openFolder } = useBooks()
  const toast = useToast()
  const state = reactive({ path: '' })
  const pending = ref(false)

  async function submit(event: FormSubmitEvent<z.output<typeof OpenFolderSchema>>) {
    pending.value = true
    try {
      const book = await openFolder(event.data.path)
      onDone?.()
      await navigateTo(writeRoute(book.id))
    }
    catch (error) {
      toast.add({ title: 'Could not open folder', description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      pending.value = false
    }
  }

  return { schema: OpenFolderSchema, state, pending, submit }
}

export const BOOK_TEMPLATES = [
  { value: 'novel', label: 'Novel', description: 'Parts, chapters and scenes, codex for characters & places, outline and style guide.' },
  { value: 'non-fiction', label: 'Non-fiction', description: 'Chapters and sections, glossary and research library.' },
  { value: 'blank', label: 'Blank', description: 'Just a first scene – structure it your way.' },
] as const

export const BOOK_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pt', label: 'Português' },
]
