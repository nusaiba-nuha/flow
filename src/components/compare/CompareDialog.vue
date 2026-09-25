<script setup>
import { computed, ref, useTemplateRef } from 'vue'

import BaseModal from '@/components/ui/BaseModal.vue'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { describeDiff, diffDocuments, isUnchanged, mergeForDiff } from '@/domain/diff.js'
import { FLOW_EXTENSION, parseFlow } from '@/domain/flowText.js'
import { renderSvg } from '@/domain/renderSvg.js'
import { useFileStore } from '@/stores/file.js'
import { useThemeStore } from '@/stores/theme.js'

/**
 * What changed between another version of the diagram and the one on screen:
 * as a list, and as a picture with additions, removals and edits marked.
 */
const emit = defineEmits(['close'])

const { document: current } = useFlowQuery()
const file = useFileStore()
const theme = useThemeStore()

const source = ref('')
const sourceName = ref('')
const fileInput = useTemplateRef('fileInput')

const parsed = computed(() => (source.value.trim() ? parseFlow(source.value) : null))
const before = computed(() => parsed.value?.document ?? null)
const diff = computed(() => (before.value ? diffDocuments(before.value, current.value) : null))
const lines = computed(() =>
  before.value && diff.value ? describeDiff(before.value, current.value, diff.value) : [],
)

const dark = () =>
  theme.preference === 'dark' ||
  (theme.preference === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)

/** As an image, so the drawing is never markup in the page. */
const picture = computed(() => {
  if (!before.value || !diff.value || isUnchanged(diff.value)) return ''
  const { document, highlight } = mergeForDiff(before.value, current.value, diff.value)
  const svg = renderSvg(document, { theme: dark() ? 'dark' : 'light', highlight })
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
})

/** @param {string} text @param {string} name */
function use(text, name) {
  source.value = text
  sourceName.value = name
}

async function openFile(/** @type {Event} */ event) {
  const picked = /** @type {HTMLInputElement} */ (event.target).files?.[0]
  if (picked) use(await picked.text(), picked.name)
}

async function useSavedFile() {
  try {
    const saved = await file.handle.getFile()
    use(await saved.text(), saved.name)
  } catch {
    sourceName.value = ''
  }
}
</script>

<template>
  <BaseModal title="Compare" @close="emit('close')">
    <div class="space-y-3 px-5 py-4">
      <p class="text-xs text-muted">
        Compare another version of this diagram, such as the file in your repository, with the one
        on screen.
      </p>

      <div class="flex flex-wrap gap-2">
        <button
          v-if="file.handle"
          type="button"
          class="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-hover"
          :title="`Compare with ${file.name} as it is saved now`"
          @click="useSavedFile"
        >
          With {{ file.name }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-hover"
          title="Compare with a .flow file from this computer"
          @click="fileInput?.click()"
        >
          Open a file
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="FLOW_EXTENSION"
        tabindex="-1"
        @change="openFile"
      />

      <label class="block">
        <span class="mb-1 block text-xs font-medium text-muted">
          {{ sourceName ? `From ${sourceName}` : 'Or paste .flow text' }}
        </span>
        <textarea
          v-model="source"
          rows="5"
          spellcheck="false"
          aria-label="The version to compare with"
          class="w-full resize-y rounded-lg border border-line bg-sunken px-3 py-2 font-mono text-xs text-ink outline-none focus:border-line-strong"
          @input="sourceName = ''"
        />
      </label>

      <p v-if="parsed && !before" class="text-xs text-danger" role="alert">
        Line {{ parsed.errors[0].line }}: {{ parsed.errors[0].message }}
      </p>

      <template v-else-if="diff">
        <p v-if="isUnchanged(diff)" class="text-sm" role="status">No changes.</p>
        <template v-else>
          <ul class="space-y-0.5 font-mono text-xs" aria-label="Changes">
            <li
              v-for="line in lines"
              :key="line"
              :class="
                line.startsWith('+')
                  ? 'text-node-message'
                  : line.startsWith('-')
                    ? 'text-danger'
                    : line.startsWith('~')
                      ? 'text-node-hours'
                      : 'text-muted'
              "
            >
              {{ line }}
            </li>
          </ul>
          <img
            :src="picture"
            alt="The diagram with additions, removals and changes marked"
            class="max-h-[45vh] w-full rounded-lg border border-line object-contain"
          />
        </template>
      </template>
    </div>
  </BaseModal>
</template>
