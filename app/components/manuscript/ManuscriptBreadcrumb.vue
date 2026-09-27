<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'
import { findNodeByPath, pathToNode } from '#shared/utils/manuscript-tree'

const props = defineProps<{
  bookId: string
  path: string
}>()

const { tree } = useManuscript(() => props.bookId)

const items = computed<BreadcrumbItem[]>(() => {
  const node = findNodeByPath(tree.value, props.path)
  if (!node) return []
  return pathToNode(tree.value, node.id).map(step => ({
    label: step.title,
    to: step.type === 'scene' ? writeRoute(props.bookId, step.path) : undefined,
  }))
})
</script>

<template>
  <UBreadcrumb
    v-if="items.length"
    :items="items"
    class="min-w-0"
  />
</template>
