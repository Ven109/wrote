import { useQuery, useQueryCache } from '@pinia/colada'
import type { PreviewFinding, ReviewAgent, SaveAgentInput } from '#shared/schemas/review'
import { slugify } from '#shared/utils/slug'
import { structureQuery } from '~/queries/manuscript'
import { bookKeys } from '~/queries/keys'
import { agentFilesQuery, reviewAgentsQuery } from '~/queries/review'
import type { StructureNode } from '#shared/schemas/manuscript'

const blank = (): SaveAgentInput => ({ id: '', name: '', description: '', instructions: '', scopes: ['scene', 'chapter'], task: 'chat', tools: [], summary: false, categories: [] })
const scenesOf = (nodes: StructureNode[], chapter = ''): { label: string, value: string }[] =>
  nodes.flatMap(node => node.type === 'scene' ? [{ label: chapter ? `${chapter} › ${node.title}` : node.title, value: node.id }] : scenesOf(node.children, node.type === 'chapter' ? node.title : chapter))

export interface AgentTestResult {
  scene: string
  findings: PreviewFinding[]
  summary: string | null
}

/**
 * The Agents page: built-in and custom review agents, a form for custom ones (saved to `agents/<id>.md`),
 * "Customize" for built-ins, and "Test on scene" that runs the draft without storing findings.
 */
export function useAgentEditor(bookId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const base = () => `/api/books/${encodeURIComponent(toValue(bookId))}/review/agents`
  const { data: agents } = useQuery(() => reviewAgentsQuery(toValue(bookId)))
  const { data: files } = useQuery(() => agentFilesQuery(toValue(bookId)))
  const { data: structure } = useQuery(() => structureQuery(toValue(bookId)))
  const selected = ref<string | null>(null)
  const draft = ref<SaveAgentInput | null>(null)
  const isNew = ref(false)
  const saving = ref(false)
  const testing = ref(false)
  const testScene = ref<string>()
  const result = ref<AgentTestResult | null>(null)
  const refresh = () => Promise.all([queryCache.invalidateQueries({ key: bookKeys.reviewAgents(toValue(bookId)) }), queryCache.invalidateQueries({ key: bookKeys.agentFiles(toValue(bookId)) })])
  const current = computed(() => (agents.value ?? []).find(agent => agent.id === selected.value) ?? null)
  const sceneItems = computed(() => scenesOf(structure.value ?? []))
  watch(sceneItems, items => (testScene.value ??= items[0]?.value), { immediate: true })

  function edit(agent: ReviewAgent) {
    selected.value = agent.id
    result.value = null
    isNew.value = false
    const { source, ...fields } = agent
    draft.value = source === 'book' ? structuredClone(fields) : null
  }

  function create() {
    selected.value = null
    result.value = null
    isNew.value = true
    draft.value = blank()
  }

  /** A built-in agent's settings as a custom copy with the same id (saving replaces the built-in for this book). */
  function customize() {
    if (!current.value) return
    const { source: _source, ...fields } = current.value
    draft.value = structuredClone(fields)
  }

  watch(() => draft.value?.name, (name) => {
    if (isNew.value && draft.value && name !== undefined) draft.value.id = slugify(name).slice(0, 63)
  })

  async function save() {
    if (!draft.value) return
    saving.value = true
    try {
      const saved = await $fetch<ReviewAgent>(`${base()}/${draft.value.id}`, { method: 'PUT', body: draft.value })
      await refresh()
      isNew.value = false
      selected.value = saved.id
      toast.add({ title: `Saved ${saved.name}`, description: `agents/${saved.id}.md`, color: 'success' })
    }
    catch (error) {
      toast.add({ title: 'Could not save the agent', description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      saving.value = false
    }
  }

  async function remove() {
    const id = selected.value
    if (!id) return
    await $fetch(`${base()}/${id}`, { method: 'DELETE' }).catch(error => toast.add({ title: 'Could not delete the agent', description: apiErrorMessage(error), color: 'error' }))
    await refresh()
    draft.value = null
  }

  async function test() {
    if (!draft.value || !testScene.value) return
    testing.value = true
    result.value = null
    try {
      result.value = await $fetch<AgentTestResult>(`${base()}/test`, { method: 'POST', body: { agent: draft.value, sceneId: testScene.value } })
    }
    catch (error) {
      toast.add({ title: 'The test run failed', description: apiErrorMessage(error), color: 'error' })
    }
    finally {
      testing.value = false
    }
  }

  return {
    agents: computed(() => agents.value ?? []),
    problems: computed(() => files.value?.problems ?? []),
    selected,
    current,
    draft,
    isNew,
    saving,
    testing,
    testScene,
    sceneItems,
    result,
    edit,
    create,
    customize,
    save,
    remove,
    test,
    close: () => {
      selected.value = null
      draft.value = null
      isNew.value = false
    },
  }
}
