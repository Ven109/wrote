import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'
import type { StructureNode } from '#shared/schemas/manuscript'
import { CHILD_TYPE, findNodeByPath, neighbourMove, type NodeType } from '#shared/utils/manuscript-tree'

const TYPE_ICON: Record<NodeType, string> = {
  part: 'i-lucide-book-marked',
  chapter: 'i-lucide-folder',
  scene: 'i-lucide-file-text',
}

const TYPE_LABEL: Record<NodeType, string> = { part: 'part', chapter: 'chapter', scene: 'scene' }

export interface ManuscriptTreeItem extends TreeItem {
  node: StructureNode
  children?: ManuscriptTreeItem[]
}

type Dialog
  = | { kind: 'create', type: NodeType, parentId?: string }
    | { kind: 'rename', node: StructureNode }
    | { kind: 'delete', node: StructureNode }

/**
 * Everything the manuscript tree needs: tree items, node menus, dialogs, drag & drop and
 * navigation. The tree components only render what this returns.
 */
export function useManuscriptTreeView(bookId: MaybeRefOrGetter<string>, activePath: MaybeRefOrGetter<string | null>) {
  const { tree, status, createNode, renameNode, moveNode, removeNode } = useManuscript(bookId)
  const { isDesktop, isCoarsePointer } = useBreakpoint()
  const dragEnabled = computed(() => isDesktop.value && !isCoarsePointer.value)
  const dragDrop = useTreeDragDrop(tree, (nodeId, target) => void moveNode({ nodeId, target }))

  const dialog = ref<Dialog | null>(null)
  const dialogOpen = computed({
    get: () => dialog.value !== null,
    set: (open) => {
      if (!open) dialog.value = null
    },
  })

  const activeNode = computed(() => {
    const path = toValue(activePath)
    return path ? findNodeByPath(tree.value, path) : null
  })

  function openScene(node: StructureNode) {
    if (node.type === 'scene') void navigateTo(writeRoute(toValue(bookId), node.path))
  }

  function toItem(node: StructureNode): ManuscriptTreeItem {
    return {
      label: node.title,
      icon: TYPE_ICON[node.type],
      node,
      defaultExpanded: true,
      children: node.children.length ? node.children.map(toItem) : undefined,
      onSelect: () => openScene(node),
    }
  }

  const items = computed(() => tree.value.map(toItem))

  function move(node: StructureNode, direction: -1 | 1) {
    const target = neighbourMove(tree.value, node.id, direction)
    if (target) void moveNode({ nodeId: node.id, target })
  }

  /** Actions for one node – used by the menu on every device, so nothing is drag-only. */
  function menuFor(node: StructureNode): DropdownMenuItem[][] {
    const child = CHILD_TYPE[node.type]
    const create: DropdownMenuItem[] = child
      ? [{ label: `New ${TYPE_LABEL[child]}`, icon: 'i-lucide-plus', onSelect: () => (dialog.value = { kind: 'create', type: child, parentId: node.id }) }]
      : []
    return [
      [...create, { label: 'Rename', icon: 'i-lucide-pencil', onSelect: () => (dialog.value = { kind: 'rename', node }) }],
      [
        { label: 'Move up', icon: 'i-lucide-arrow-up', disabled: !neighbourMove(tree.value, node.id, -1), onSelect: () => move(node, -1) },
        { label: 'Move down', icon: 'i-lucide-arrow-down', disabled: !neighbourMove(tree.value, node.id, 1), onSelect: () => move(node, 1) },
      ],
      [{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => (dialog.value = { kind: 'delete', node }) }],
    ]
  }

  function newPart() {
    dialog.value = { kind: 'create', type: 'part' }
  }

  async function submitPrompt(title: string) {
    const current = dialog.value
    if (current?.kind === 'rename') await renameNode({ nodeId: current.node.id, title })
    if (current?.kind === 'create') {
      const created = await createNode({ type: current.type, title, parentId: current.parentId })
      if (current.type === 'scene') await navigateTo(writeRoute(toValue(bookId), created.path))
    }
  }

  async function confirmDelete() {
    if (dialog.value?.kind === 'delete') await removeNode(dialog.value.node.id)
  }

  const promptTitle = computed(() => {
    const current = dialog.value
    if (current?.kind === 'rename') return `Rename ${TYPE_LABEL[current.node.type]}`
    if (current?.kind === 'create') return `New ${TYPE_LABEL[current.type]}`
    return ''
  })

  return {
    items,
    status,
    activeNode,
    dragEnabled,
    dragDrop,
    menuFor,
    newPart,
    dialog,
    dialogOpen,
    promptTitle,
    submitPrompt,
    confirmDelete,
  }
}
