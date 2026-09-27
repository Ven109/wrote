import type { LinkRef } from '#shared/schemas/links'

/** Toast after a rename rewrote `[[links]]` in other entries, with an undo action. */
export function useLinkUpdateNotice() {
  const toast = useToast()

  function notify(updated: LinkRef[] | undefined, undo: () => unknown) {
    if (!updated?.length) return
    const names = updated.slice(0, 3).map(ref => ref.title).join(', ')
    toast.add({
      title: `Updated links in ${updated.length} ${updated.length === 1 ? 'entry' : 'entries'}`,
      description: updated.length > 3 ? `${names} and ${updated.length - 3} more` : names,
      icon: 'i-lucide-link',
      actions: [{ label: 'Undo rename', color: 'neutral', variant: 'outline', onClick: () => void undo() }],
    })
  }

  return { notify }
}
