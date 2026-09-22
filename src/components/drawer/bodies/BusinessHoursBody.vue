<script setup>
import { computed, onMounted } from 'vue'
// v14 ships a named export, not a default.
import { VueDatePicker } from '@vuepic/vue-datepicker'

import { dayLabel } from '@/domain/format.js'
import {
  fromPickerTime,
  localTimezone,
  normaliseWeek,
  offsetMinutes,
  timezoneLabel,
  timezoneOptions,
  toPickerTime,
} from '@/domain/time.js'
import { validateTimeRange } from '@/domain/validators.js'

const data = defineModel({
  type: /** @type {import('vue').PropType<import('@/domain/types.js').FlowNodeData>} */ (Object),
  required: true,
})

onMounted(() => {
  data.value.times = normaliseWeek(data.value.times)
  // An existing zone is never rewritten to match whoever opened the editor.
  data.value.timezone = data.value.timezone || 'UTC'
})

const zones = computed(() => timezoneOptions(data.value.timezone))

/** Hours are kept in the node's zone, so a reader elsewhere needs the difference. */
const elsewhere = computed(() => {
  const zone = data.value.timezone
  const local = localTimezone()
  if (!zone || zone === local) return ''

  const difference = (offsetMinutes(zone) - offsetMinutes(local)) / 60
  if (difference === 0) return `Same time as ${timezoneLabel(local)}`

  const hours = Math.abs(difference) === 1 ? 'hour' : 'hours'
  return `${Math.abs(difference)} ${hours} ${difference > 0 ? 'ahead of' : 'behind'} your time`
})

/**
 * @param {number} index
 * @param {'startTime' | 'endTime'} field
 * @param {import('@/domain/time.js').PickerTime | null} picked
 */
function setTime(index, field, picked) {
  const times = data.value.times ?? []
  times[index][field] = fromPickerTime(picked)
}

/**
 * Typing beats clicking arrows for a time you already know. `HHmm` is left out:
 * the picker does not parse it and silently dropped the value.
 */
const TEXT_INPUT = {
  enterSubmit: true,
  tabSubmit: true,
  openMenu: false,
  format: ['HH:mm', 'H:mm'],
}

/** @param {import('@/domain/types.js').BusinessHour} slot */
const rowError = (slot) => validateTimeRange(slot.startTime, slot.endTime)
</script>

<template>
  <section class="space-y-3 border-t border-line pt-4">
    <h3 class="text-xs font-semibold tracking-wide text-muted uppercase">Business hours</h3>

    <p class="text-xs text-muted">
      Branches the flow on the time a conversation opens. Success runs inside these hours, failure
      outside them.
    </p>

    <ul class="space-y-2">
      <li v-for="(slot, index) in data.times" :key="slot.day">
        <div class="flex items-center gap-2">
          <span class="w-9 text-xs font-medium">{{ dayLabel(slot.day) }}</span>

          <VueDatePicker
            :model-value="toPickerTime(slot.startTime)"
            time-picker
            :clearable="false"
            :is-24="true"
            text-input
            :text-input-options="TEXT_INPUT"
            :aria-labels="{ input: `${dayLabel(slot.day)} start time` }"
            class="flex-1"
            @update:model-value="setTime(index, 'startTime', $event)"
          />

          <span class="text-xs text-muted">to</span>

          <VueDatePicker
            :model-value="toPickerTime(slot.endTime)"
            time-picker
            :clearable="false"
            :is-24="true"
            text-input
            :text-input-options="TEXT_INPUT"
            :aria-labels="{ input: `${dayLabel(slot.day)} end time` }"
            class="flex-1"
            @update:model-value="setTime(index, 'endTime', $event)"
          />
        </div>

        <p v-if="rowError(slot)" class="mt-1 pl-11 text-xs text-danger" role="alert">
          {{ rowError(slot) }}
        </p>
      </li>
    </ul>

    <div>
      <label for="timezone" class="mb-1 block text-xs font-medium text-muted">Time zone</label>
      <select
        id="timezone"
        v-model="data.timezone"
        class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-line-strong"
        title="The zone these hours are kept in. New nodes start in yours; this one keeps its own"
      >
        <option v-for="zone in zones" :key="zone.value" :value="zone.value">
          {{ zone.label }}
        </option>
      </select>

      <p v-if="elsewhere" class="mt-1 text-xs text-muted">{{ elsewhere }}</p>
    </div>
  </section>
</template>
