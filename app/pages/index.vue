<script setup lang="ts">
// The apex homepage always bounces to the personal site.
// Server middleware redirects '/' on fresh server requests; this handler covers
// client-side SPA navigation to '/' (e.g. the logo), which never hits that middleware.
onMounted(() => {
  window.location.replace('https://leocaseiro.com')
})
</script>

<template>
  <div />
</template>
