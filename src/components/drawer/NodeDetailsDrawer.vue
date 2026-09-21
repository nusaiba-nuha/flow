<script setup>
defineProps({ id: { type: String, required: true } })
</script>

<template>
  <aside class="fixed inset-y-0 right-0 w-96 border-l p-6">Node {{ id }}</aside>
</template>
