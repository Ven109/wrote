<script setup lang="ts">
import type { ReviewAgent } from '#shared/schemas/review'

/** Built-in and custom review agents, plus custom agent files that could not be read. */
defineProps<{ agents: ReviewAgent[], selected: string | null, problems: { file: string, message: string }[] }>()
defineEmits<{ select: [agent: ReviewAgent], create: [] }>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-lg font-semibold text-highlighted">
        Review agents
      </h1>
      <UButton
        label="New agent"
        icon="i-lucide-plus"
        size="sm"
        class="min-h-11 lg:min-h-0"
        @click="$emit('create')"
      />
    </div>
    <UAlert
      v-for="problem in problems"
      :key="problem.file"
      :title="`${problem.file} is not a valid agent`"
      :description="problem.message"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
    />
    <nav aria-label="Agents">
      <ul class="flex flex-col gap-1">
        <li
          v-for="agent in agents"
          :key="agent.id"
        >
          <button
            type="button"
            class="flex min-h-11 w-full flex-col items-start rounded-md px-3 py-2 text-start hover:bg-elevated"
            :class="selected === agent.id ? 'bg-elevated' : ''"
            :aria-current="selected === agent.id ? 'true' : undefined"
            @click="$emit('select', agent)"
          >
            <span class="flex items-center gap-2 font-medium text-highlighted">
              {{ agent.name }}
              <UBadge
                :label="agent.source === 'book' ? 'Custom' : 'Built-in'"
                :color="agent.source === 'book' ? 'primary' : 'neutral'"
                variant="subtle"
                size="sm"
              />
            </span>
            <span class="line-clamp-2 text-sm text-muted">{{ agent.description }}</span>
          </button>
        </li>
      </ul>
    </nav>
    <p class="text-xs text-dimmed">
      Custom agents are Markdown files in the book's <code>agents/</code> folder: settings in the frontmatter, instructions in the body.
    </p>
  </div>
</template>
