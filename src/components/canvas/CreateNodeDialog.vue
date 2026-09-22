<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/ui/TextField.vue'
import SelectField from '@/components/ui/SelectField.vue'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useCreateNode } from '@/composables/useNodeMutations.js'
import { useDraft } from '@/composables/useDraft.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { CREATABLE_NODES } from '@/domain/nodeMeta.js'
import { nextFreePosition } from '@/domain/layout.js'
import { FIELD_LIMIT, maxLength, required } from '@/domain/validators.js'
import { toNodeId } from '@/domain/graph.js'
import { ROUTE } from '@/router/index.js'

const emit = defineEmits(['close'])

const router = useRouter()
const canvas = useCanvasStore()
const { nodes } = useFlowQuery()
const createNode = useCreateNode()

const blank = computed(() => ({ id: 'new', title: '', description: '', nodeType: '' }))

const { draft, errors, isValid, touch, touchAll } = useDraft(blank, {
  title: [required('Title'), maxLength('Title', FIELD_LIMIT.TITLE_MAX)],
  description: [maxLength('Description', FIELD_LIMIT.DESCRIPTION_MAX)],
  nodeType: [required('Type of node')],
})

const options = CREATABLE_NODES.map(({ value, label }) => ({ value, label }))
const failed = ref(false)

function submit() {
  touchAll()
  if (!isValid.value) return

  failed.value = false
  createNode.mutate(
    {
      title: draft.title,
      description: draft.description,
      nodeType: draft.nodeType,
      // Below the existing tree rather than on top of it.
      position: nextFreePosition(nodes.value),
    },
    {
      onSuccess(node) {
        const id = toNodeId(node.id)
        // Creating something usually means you are about to fill it in.
        canvas.requestFocus(id)
        router.push({ name: ROUTE.NODE_DETAILS, params: { id } })
        emit('close')
      },
      onError() {
        failed.value = true
      },
    },
  )
}
</script>

<template>
  <BaseModal title="Create new node" @close="emit('close')">
    <form class="space-y-4 px-5 py-4" @submit.prevent="submit">
      <TextField
        v-model="draft.title"
        label="Title"
        placeholder="Welcome message"
        :error="errors.title"
        :maxlength="FIELD_LIMIT.TITLE_MAX"
        @blur="touch('title')"
      />

      <TextField
        v-model="draft.description"
        label="Description"
        multiline
        placeholder="What does this step do?"
        :error="errors.description"
        :maxlength="FIELD_LIMIT.DESCRIPTION_MAX"
        @blur="touch('description')"
      />

      <SelectField
        v-model="draft.nodeType"
        label="Type of node"
        placeholder="Select a node type"
        :options="options"
        :error="errors.nodeType"
        @blur="touch('nodeType')"
      />

      <!-- Said here, not only in a tooltip: nobody should be surprised by where
           the node ends up. -->
      <p class="text-xs text-muted">
        The node is added on its own, below the flow. Connecting nodes to each other is not part of
        this version.
      </p>

      <p v-if="failed" class="text-xs text-danger" role="alert">
        The node could not be created. Nothing was changed.
      </p>

      <div class="flex justify-end gap-2 pt-1">
        <button
          type="button"
          class="rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:bg-hover"
          title="Close without creating a node (Esc)"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-hover disabled:opacity-40"
          title="Create the node and open its details"
          :disabled="createNode.isPending.value"
        >
          {{ createNode.isPending.value ? 'Creating' : 'Create node' }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
