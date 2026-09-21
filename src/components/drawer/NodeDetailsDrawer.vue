<script setup>
// `props: true` on the route hands the id in as a prop, so this component can be
// mounted in a test without a router. Replaced properly at FL-16.
defineProps({ id: { type: String, required: true } })
</script>

<template>
  <aside class="fixed inset-y-0 right-0 w-96 border-l p-6">Node {{ id }}</aside>
</template>
