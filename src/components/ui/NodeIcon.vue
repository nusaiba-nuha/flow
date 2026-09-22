<script setup>
/** Inline: six icons do not justify an icon package. */
defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 16 },
})

/** @type {Readonly<Record<string, string>>} */
const PATHS = Object.freeze({
  bolt: 'M13 2 4.5 12.5H11l-1 9.5 8.5-10.5H12l1-9.5Z',
  calendar:
    'M7 3v3M17 3v3M3.5 9.5h17M5 6h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 21H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 6Z',
  branch: 'M6 4v6a4 4 0 0 0 4 4h8M18 10l3 4-3 4',
  send: 'M4 12 20 4l-4 16-4-6-8-2Z',
  comment: 'M4 5.5h16v11H9l-5 4v-15Z',
  question: 'M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.8M12 17h.01',
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="PATHS[name] ?? PATHS.question" />
  </svg>
</template>
