<script setup lang="ts">
import { SCENE_STATUSES } from '#shared/schemas/entry'
import type { SceneMetaForm } from '~/utils/scene-meta'

defineProps<{ saving?: boolean }>()
const open = defineModel<boolean>('open', { default: false })
const form = defineModel<SceneMetaForm>('form', { required: true })
defineEmits<{ save: [] }>()
const statusItems = SCENE_STATUSES.map(status => ({ label: status[0]!.toUpperCase() + status.slice(1), value: status }))
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Scene details"
    description="Metadata stored in the scene's frontmatter."
  >
    <template #body>
      <UForm
        :state="form"
        class="flex flex-col gap-4"
        @submit="$emit('save')"
      >
        <UFormField
          label="Status"
          name="status"
        >
          <USelect
            v-model="form.status"
            :items="statusItems"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="POV"
          name="pov"
        >
          <UInput
            v-model="form.pov"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Location"
          name="location"
        >
          <UInput
            v-model="form.location"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Timeline"
          name="timeline"
          hint="Date or moment in the story"
        >
          <UInput
            v-model="form.timeline"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Synopsis"
          name="synopsis"
        >
          <UTextarea
            v-model="form.synopsis"
            :rows="4"
            autoresize
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Tags"
          name="tags"
        >
          <UInputTags
            v-model="form.tags"
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          label="Save details"
          :loading="saving"
          block
          class="min-h-11"
        />
      </UForm>
    </template>
  </USlideover>
</template>
