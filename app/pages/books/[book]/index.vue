<script setup lang="ts">
const bookId = useRouteBookId()
await navigateTo(writeRoute(bookId.value), { replace: true })
</script>

<template>
  <div />
</template>
