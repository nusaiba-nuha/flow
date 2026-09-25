<script setup>
import BaseModal from '@/components/ui/BaseModal.vue'
import KeyCap from '@/components/ui/KeyCap.vue'
import { usePlatform } from '@/composables/usePlatform.js'
import { SHORTCUT_GROUPS } from '@/domain/shortcuts.js'

const emit = defineEmits(['close'])

const { isMac } = usePlatform()
const groups = SHORTCUT_GROUPS
</script>

<template>
  <BaseModal title="Keyboard shortcuts" @close="emit('close')">
    <div class="scroll-panel max-h-[70vh] px-5 py-4">
      <section v-for="group in groups" :key="group.title" class="mb-5 last:mb-0">
        <h3 class="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
          {{ group.title }}
        </h3>

        <p v-if="group.note" class="mb-2 text-xs text-subtle">{{ group.note }}</p>

        <ul class="divide-y divide-line">
          <li
            v-for="shortcut in group.shortcuts"
            :key="`${group.title}-${shortcut.description}`"
            class="flex items-center justify-between gap-4 py-2"
          >
            <span class="text-sm text-ink">{{ shortcut.description }}</span>

            <span class="flex shrink-0 items-center gap-1.5">
              <template v-for="(combo, comboIndex) in shortcut.combos" :key="combo.join('+')">
                <span v-if="comboIndex > 0" class="text-[11px] text-subtle">or</span>

                <span class="flex items-center gap-1">
                  <template v-for="(key, keyIndex) in combo" :key="key">
                    <span v-if="keyIndex > 0" class="text-[11px] text-subtle">+</span>
                    <KeyCap :value="key" :is-mac="isMac" />
                  </template>
                </span>
              </template>
            </span>
          </li>
        </ul>
      </section>

      <section class="mt-6 border-t border-line pt-4">
        <h3 class="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">About</h3>
        <p class="text-sm text-ink">Flow Builder</p>
        <p class="mt-1 text-xs text-muted">
          A diagram editor built with Vue 3, Vue Flow and TanStack Query. Nodes render on a
          draggable canvas and are edited through a drawer that lives at its own URL, so every node
          can be linked to directly.
        </p>
        <p class="mt-2 text-xs text-muted">
          Changes are saved in this browser. <span class="text-ink">Reset flow</span> restores the
          starter diagram.
        </p>
      </section>
    </div>

    <footer class="flex justify-end border-t border-line px-5 py-3">
      <button
        type="button"
        class="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-hover"
        title="Close (Esc)"
        @click="emit('close')"
      >
        Close
      </button>
    </footer>
  </BaseModal>
</template>
