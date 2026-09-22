<script setup>
import { computed, ref } from 'vue'

import TextField from '@/components/ui/TextField.vue'
import AttachmentTile from '@/components/ui/AttachmentTile.vue'
import { useAttachmentUpload } from '@/composables/useAttachmentUpload.js'
import { useStableKeys } from '@/composables/useStableKeys.js'
import { MESSAGE_PART } from '@/domain/constants.js'
import { FIELD_LIMIT } from '@/domain/validators.js'

const data = defineModel({
  type: /** @type {import('vue').PropType<import('@/domain/types.js').FlowNodeData>} */ (Object),
  required: true,
})

const { toAttachment, error: uploadError, isReading } = useAttachmentUpload()
const { keyFor } = useStableKeys()
/** @type {import('vue').Ref<HTMLInputElement | null>} */
const fileInput = ref(null)

// Seed once so the template can push into it.
if (!data.value.payload) data.value.payload = []

const payload = computed(() => data.value.payload ?? [])

/** Keeps the payload index, so removing a text leaves the attachments alone. */
const texts = computed(() =>
  payload.value
    .map((part, index) => ({ part, index }))
    .filter(
      /** @returns {entry is { part: import('@/domain/types.js').TextPart, index: number }} */
      (entry) => entry.part.type === MESSAGE_PART.TEXT,
    ),
)

const attachments = computed(() =>
  payload.value
    .map((part, index) => ({ part, index }))
    .filter(
      /** @returns {entry is { part: import('@/domain/types.js').AttachmentPart, index: number }} */
      (entry) => entry.part.type === MESSAGE_PART.ATTACHMENT,
    ),
)

function addText() {
  payload.value.push({ type: MESSAGE_PART.TEXT, text: '' })
}

/** @param {number} index */
function removePart(index) {
  payload.value.splice(index, 1)
}

/** @param {Event} event */
async function onFilesPicked(event) {
  const input = /** @type {HTMLInputElement} */ (event.target)

  for (const file of Array.from(input.files ?? [])) {
    const attachment = await toAttachment(file)
    if (attachment) payload.value.push(attachment)
  }

  // Reset, or picking the same file twice fires no change event.
  input.value = ''
}
</script>

<template>
  <section class="space-y-4 border-t border-line pt-4">
    <div>
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-xs font-semibold tracking-wide text-muted uppercase">Messages</h3>
        <button
          type="button"
          class="text-xs font-medium text-ink hover:underline"
          title="Add another block of text to this message"
          @click="addText"
        >
          Add text
        </button>
      </div>

      <p v-if="!texts.length" class="text-xs text-muted">No text in this message yet.</p>

      <div
        v-for="({ part, index }, position) in texts"
        :key="keyFor(part)"
        class="mb-3 flex items-start gap-2"
      >
        <div class="flex-1">
          <TextField
            v-model="part.text"
            :label="`Text ${position + 1}`"
            multiline
            :maxlength="FIELD_LIMIT.MESSAGE_MAX"
          />
        </div>
        <button
          type="button"
          class="mt-6 rounded-md p-1 text-muted hover:text-danger"
          :aria-label="`Remove text ${position + 1}`"
          :title="`Remove text ${position + 1} from this message`"
          @click="removePart(index)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V5h6v2" />
          </svg>
        </button>
      </div>
    </div>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-xs font-semibold tracking-wide text-muted uppercase">Attachments</h3>
        <span :title="isReading ? 'Reading the file' : 'Attach an image, up to 2 MB'">
          <button
            type="button"
            class="text-xs font-medium text-ink hover:underline disabled:opacity-40"
            :disabled="isReading"
            @click="fileInput?.click()"
          >
            {{ isReading ? 'Reading' : 'Upload' }}
          </button>
        </span>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="sr-only"
        aria-label="Upload attachments"
        @change="onFilesPicked"
      />

      <p v-if="!attachments.length" class="text-xs text-muted">No attachments yet.</p>

      <div v-else class="grid grid-cols-2 gap-2">
        <AttachmentTile
          v-for="{ part, index } in attachments"
          :key="keyFor(part)"
          :attachment="part.attachment"
          :name="part.name"
          @remove="removePart(index)"
        />
      </div>

      <p v-if="uploadError" class="mt-2 text-xs text-danger" role="alert">{{ uploadError }}</p>
    </div>
  </section>
</template>
