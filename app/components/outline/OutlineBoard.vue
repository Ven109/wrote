<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Act, Beat, Outline } from '#shared/schemas/outline'
import type { OutlineProposal } from '#shared/schemas/outline-proposals'
import type { BeatDrop } from '~/utils/outline-board'

/** One column per act, one card per beat; drag cards between and within columns (or use their menu). Proposals show as ghost cards in place. */
const props = defineProps<{
  outline: Outline
  dragEnabled: boolean
  dragging: string | null
  drop: BeatDrop | null
  cardHandlers: (beatId: string, actId: string, nextBeatId: string | null) => Record<string, unknown>
  columnHandlers: (actId: string) => Record<string, unknown>
  actMenu: (act: Act) => DropdownMenuItem[][]
  beatMenu: (beat: Beat) => DropdownMenuItem[][]
  ghosts: (actId: string, afterBeatId: string | null) => OutlineProposal[]
  beatTitle: (beatId: string) => string | undefined
  busy: string | null
}>()
defineEmits<{ open: [beat: Beat], addBeat: [act: Act], accept: [proposal: OutlineProposal], reject: [proposal: OutlineProposal] }>()
const dropsBefore = (actId: string, beatId: string | null) => props.drop?.actId === actId && props.drop.beforeBeatId === beatId
</script>

<template>
  <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:overflow-x-auto lg:pb-2">
    <section
      v-for="act in outline.acts"
      :key="act.id"
      :aria-label="act.title"
      class="flex w-full shrink-0 flex-col gap-2 rounded-xl bg-elevated/50 p-3 lg:w-72"
      :class="dropsBefore(act.id, null) ? 'ring-2 ring-primary' : ''"
      v-bind="dragEnabled ? columnHandlers(act.id) : {}"
    >
      <header class="flex items-center gap-1">
        <h2 class="min-w-0 flex-1 truncate font-semibold text-highlighted">
          {{ act.title }}
        </h2>
        <span class="text-xs text-muted tabular-nums">{{ act.beats.length }}</span>
        <BaseActionsMenu
          :items="actMenu(act)"
          :label="act.title"
        />
      </header>
      <ol class="flex min-h-12 flex-col gap-2">
        <OutlineProposalCard
          v-for="proposal in ghosts(act.id, null)"
          :key="proposal.id"
          :proposal="proposal"
          :busy="busy === proposal.id"
          @accept="$emit('accept', proposal)"
          @reject="$emit('reject', proposal)"
        />
        <template
          v-for="(beat, index) in act.beats"
          :key="beat.id"
        >
          <OutlineBeatCard
            :beat="beat"
            :menu="beatMenu(beat)"
            :dragging="dragging === beat.id"
            :drop-before="dropsBefore(act.id, beat.id)"
            v-bind="dragEnabled ? cardHandlers(beat.id, act.id, act.beats[index + 1]?.id ?? null) : {}"
            @open="$emit('open', beat)"
          />
          <OutlineProposalCard
            v-for="proposal in ghosts(act.id, beat.id)"
            :key="proposal.id"
            :proposal="proposal"
            :target-title="proposal.change.kind === 'updateBeat' ? beatTitle(proposal.change.beatId) : undefined"
            :busy="busy === proposal.id"
            @accept="$emit('accept', proposal)"
            @reject="$emit('reject', proposal)"
          />
        </template>
      </ol>
      <UButton
        label="Add beat"
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        size="sm"
        class="min-h-11 lg:min-h-0"
        :aria-label="`Add beat to ${act.title}`"
        @click="$emit('addBeat', act)"
      />
    </section>
  </div>
</template>
