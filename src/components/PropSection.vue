<template>
  <details class="prop-sec" :open="open" @toggle="onToggle">
    <summary class="prop-sum">
      <span class="prop-sum-title">{{ title }}</span>
      <span v-if="unit" class="prop-sum-unit">{{ unit }}</span>
      <span class="prop-chev" aria-hidden="true"></span>
    </summary>
    <div class="prop-body">
      <slot />
    </div>
  </details>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  unit: { type: String, default: '' },
  defaultOpen: { type: Boolean, default: true }
})

const KEY = 'labelprint_prop_sections_v1'

function loadMap() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch { return {} }
}

function saveMap(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)) } catch { /* ignore */ }
}

const open = ref(props.defaultOpen)
const saved = loadMap()
if (typeof saved[props.id] === 'boolean') open.value = saved[props.id]

watch(() => props.defaultOpen, (v) => {
  if (typeof loadMap()[props.id] !== 'boolean') open.value = v
})

function onToggle(e) {
  open.value = e.target.open
  const map = loadMap()
  map[props.id] = open.value
  saveMap(map)
}
</script>

<style scoped>
.prop-sec {
  margin: 0 0 14px;
  border: 0;
  min-width: 0;
}
.prop-sum {
  display: flex;
  align-items: center;
  gap: 6px;
  list-style: none;
  cursor: pointer;
  user-select: none;
  padding: 0 0 7px;
  margin: 0 0 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}
.prop-sum::-webkit-details-marker { display: none; }
.prop-sum-title { flex: 0 1 auto; }
.prop-sum-unit {
  font-weight: 600;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--text-muted) 70%, var(--primary));
  text-transform: uppercase;
}
.prop-chev {
  margin-left: auto;
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  background:
    linear-gradient(45deg, transparent 45%, currentColor 45%, currentColor 55%, transparent 55%),
    linear-gradient(-45deg, transparent 45%, currentColor 45%, currentColor 55%, transparent 55%);
  background-position: 0 3px, 5px 3px;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  opacity: 0.55;
  transform: rotate(0deg);
  transition: transform 0.12s ease;
}
.prop-sec[open] .prop-chev {
  transform: rotate(180deg);
  background-position: 0 2px, 5px 2px;
}
.prop-sum:hover { color: var(--text-secondary); }
.prop-sum:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 2px;
}
.prop-body { min-width: 0; }

@media (prefers-reduced-motion: reduce) {
  .prop-chev { transition: none; }
}
</style>
