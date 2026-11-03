<template>
  <RouterView />
  <ToastHost />
</template>

<script setup>
import { RouterView } from 'vue-router'
import ToastHost from './components/ToastHost.vue'
</script>

<style>
html,
body,
#app {
  min-height: 100%;
}
</style>
