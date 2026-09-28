<script setup lang="ts">
import type { BeatDraft } from '~/composables/useBeatEditor'
import type { Option } from '~/utils/outline-scenes'

/** Edits a beat: title, summary, the scenes that tell it, and "create a scene from this beat". */
defineProps<{ scenes: Option[], chapters: Option[], creating: boolean, created: { title: string, href: string } | null }>()
const draft = defineModel<BeatDraft | null>({ required: true })
defineEmits<{ save: [], createScene: [] }>()
const open = computed({ get: () => draft.value !== null, set: value => !value && (draft.value = null) })
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Beat"
  >
    <template #body>
      <form
        v-if="draft"
        class="flex flex-col gap-4"
        @submit.prevent="$emit('save')"
      >
        <UFormField label="Title">
          <UInput
            v-model="draft.title"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Summary">
          <UTextarea
            v-model="draft.summary"
            :rows="6"
            autoresize
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Scenes"
          hint="Which scenes tell this beat"
        >
          <USelectMenu
            v-model="draft.scenes"
            :items="scenes"
            value-key="value"
            multiple
            placeholder="Not written yet"
            aria-label="Linked scenes"
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          label="Save"
          class="self-end"
          :disabled="!draft.title.trim()"
        />
        <USeparator />
        <div class="flex flex-col gap-2">
          <p class="text-sm text-muted">
            Create a new scene from this beat – titled after it, with the summary as its synopsis.
          </p>
          <div class="flex flex-col gap-2 sm:flex-row">
            <USelect
              v-model="draft.chapterId"
              :items="chapters"
              placeholder="Choose a chapter"
              aria-label="Chapter for the new scene"
              class="w-full"
            />
            <UButton
              label="Create scene"
              icon="i-lucide-file-plus"
              color="neutral"
              variant="soft"
              class="min-h-11 shrink-0 justify-center sm:min-h-0"
              :loading="creating"
              :disabled="!draft.chapterId"
              @click="$emit('createScene')"
            />
          </div>
          <UAlert
            v-if="created"
            color="success"
            variant="subtle"
            icon="i-lucide-check"
            title="Scene created and linked"
          >
            <template #description>
              <ULink
                :to="created.href"
                class="underline"
              >
                Open “{{ created.title }}”
              </ULink>
            </template>
          </UAlert>
        </div>
      </form>
    </template>
  </USlideover>
</template>
