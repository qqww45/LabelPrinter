<template>
  <figure class="mkt-img" :class="{ 'mkt-img-cover': cover }" :style="figureStyle">
    <img
      :src="src"
      :alt="alt"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async"
      @error="onError"
    />
    <figcaption v-if="$slots.default" class="mkt-img-caption">
      <slot />
    </figcaption>
  </figure>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  aspect: { type: String, default: '' },
  priority: { type: Boolean, default: false },
  cover: { type: Boolean, default: true },
  radius: { type: String, default: '16px' }
})

const failed = ref(false)

const figureStyle = computed(() => {
  const style = { borderRadius: props.radius }
  if (props.aspect) style.aspectRatio = props.aspect
  return style
})

function onError(e) {
  failed.value = true
  e.target.style.opacity = '0.35'
}
</script>

<style scoped>
.mkt-img {
  margin: 0;
  overflow: hidden;
  background: var(--bg-hover);
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08);
}
[data-theme='dark'] .mkt-img {
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.35);
}
.mkt-img img {
  display: block;
  width: 100%;
  height: auto;
  vertical-align: middle;
}
.mkt-img-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mkt-img-cover {
  display: block;
}
.mkt-img-cover:not([style*='aspect-ratio']) {
  min-height: 120px;
}
.mkt-img:not(.mkt-img-cover)[style*='aspect-ratio'] {
  display: flex;
  align-items: center;
  justify-content: center;
}
.mkt-img:not(.mkt-img-cover)[style*='aspect-ratio'] img {
  width: auto;
  max-width: 90%;
  max-height: 90%;
  height: auto;
  object-fit: contain;
}
.mkt-img-caption {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
}
</style>
