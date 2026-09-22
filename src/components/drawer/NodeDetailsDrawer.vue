<script setup>
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'

import TextField from '@/components/ui/TextField.vue'
import { useNode } from '@/composables/useFlowQuery.js'
import { useDeleteNode, useUpdateNode } from '@/composables/useNodeMutations.js'
import { useDraft } from '@/composables/useDraft.js'
import { metaFor } from '@/domain/nodeMeta.js'
import { FIELD_LIMIT, maxLength, required } from '@/domain/validators.js'
import { ROUTE } from '@/router/index.js'
import DrawerHeader from './DrawerHeader.vue'
import DrawerFooter from './DrawerFooter.vue'
import { detailComponentFor } from './detailComponents.js'

const props = defineProps({ id: { type: String, required: true } })

const router = useRouter()
const { node, isLoading } = useNode(() => props.id)
const updateNode = useUpdateNode()
const deleteNode = useDeleteNode()

const meta = computed(() => (node.value ? metaFor(node.value.type) : null))
const body = computed(() => (node.value ? detailComponentFor(node.value.type) : null))

/** One draft for the whole node, so the footer has a single Save. */
const editable = computed(() =>
  node.value
    ? {
        id: node.value.id,
        name: node.value.name,
        description: node.value.data.description ?? '',
        data: node.value.data,
      }
    : null,
)

const { draft, errors, isValid, isDirty, touch, touchAll, reset } = useDraft(editable, {
  name: [required('Title'), maxLength('Title', FIELD_LIMIT.TITLE_MAX)],
  description: [maxLength('Description', FIELD_LIMIT.DESCRIPTION_MAX)],
  data: [],
})

const footerError = computed(() =>
  updateNode.isError.value ? 'Could not save. Your changes were rolled back.' : null,
)

const titleField = useTemplateRef('titleField')
const footer = useTemplateRef('footer')

function close() {
  router.push({ name: ROUTE.FLOW })
}

function save() {
  touchAll()
  if (!isValid.value || !isDirty.value) return

  updateNode.mutate({
    id: props.id,
    patch: { name: draft.name, data: { ...draft.data, description: draft.description } },
  })
}

function remove() {
  deleteNode.mutate({ id: props.id }, { onSuccess: close })
}

/** @param {KeyboardEvent} event */
function onKeydown(event) {
  if (event.key !== 'Escape') return
  // Back out of the confirmation first, so Escape never deletes by surprise.
  if (footer.value?.confirming) footer.value.cancelConfirm()
  else close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  titleField.value?.querySelector('input')?.focus()
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <aside
    class="absolute inset-y-0 right-0 z-10 flex w-[380px] max-w-full flex-col border-l border-line bg-surface shadow-xl"
    role="dialog"
    aria-modal="false"
    :aria-label="meta ? `${meta.label} details` : 'Node details'"
  >
    <DrawerHeader
      :label="meta?.label ?? 'Node'"
      :icon="meta?.icon ?? ''"
      :accent="meta?.accent ?? 'unknown'"
      :name="node?.name ?? 'Loading'"
      @close="close"
    />

    <div v-if="isLoading" class="p-5 text-sm text-muted" role="status">Loading node</div>

    <div v-else-if="!node" class="p-5" role="alert">
      <p class="text-sm font-medium">This node no longer exists.</p>
      <p class="mt-1 text-xs text-muted">It may have been deleted in another tab.</p>
      <button
        type="button"
        class="mt-4 rounded-lg border border-line px-3 py-1.5 text-sm transition-colors hover:bg-hover"
        title="Return to the flow (Esc)"
        @click="close"
      >
        Back to canvas
      </button>
    </div>

    <template v-else>
      <div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div ref="titleField">
          <TextField
            v-model="draft.name"
            label="Title"
            :error="errors.name"
            :maxlength="FIELD_LIMIT.TITLE_MAX"
            @blur="touch('name')"
          />
        </div>

        <TextField
          v-model="draft.description"
          label="Description"
          multiline
          placeholder="What does this step do?"
          :error="errors.description"
          :maxlength="FIELD_LIMIT.DESCRIPTION_MAX"
          @blur="touch('description')"
        />

        <component :is="body" v-if="body" v-model="draft.data" />
      </div>

      <DrawerFooter
        ref="footer"
        :is-dirty="isDirty"
        :is-saving="updateNode.isPending.value"
        :is-deleting="deleteNode.isPending.value"
        :can-delete="meta?.deletable ?? false"
        :error="footerError"
        @save="save"
        @cancel="reset"
        @delete="remove"
      />
    </template>
  </aside>
</template>
