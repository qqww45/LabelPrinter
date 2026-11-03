<template>
  <RouterView />
  <ToastHost />
</template>

<script setup>
import { watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import ToastHost from './components/ToastHost.vue'

const route = useRoute()

watch(
  () => route.path,
  (path) => {
    const editor = path === '/app'
    document.documentElement.classList.toggle('editor-shell', editor)
    document.documentElement.classList.toggle('site-shell', !editor)
  },
  { immediate: true }
)
</script>

<style>
html,
body,
#app {
  min-height: 100%;
}
</style>
