<template>
  <div class="toast-host" aria-live="polite" aria-relevant="additions">
    <TransitionGroup name="toast">
      <div
        v-for="item in state.items"
        :key="item.id"
        class="toast"
        :class="'toast-' + item.type"
        role="status"
      >
        <span class="toast-dot" aria-hidden="true"></span>
        <span class="toast-msg">{{ item.message }}</span>
        <button class="toast-x" type="button" :aria-label="t('关闭')" @click="dismissToast(item.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToastState, dismissToast } from '../utils/toast'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const state = useToastState()
</script>

<style scoped>
.toast-host {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--bg-panel);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.14);
  font-size: 13px;
  line-height: 1.45;
}
.toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  background: var(--primary);
}
.toast-success .toast-dot { background: var(--success); }
.toast-error .toast-dot { background: var(--danger); }
.toast-info .toast-dot { background: var(--primary); }
.toast-success { border-color: rgba(16, 185, 129, 0.35); }
.toast-error { border-color: rgba(239, 68, 68, 0.35); }
.toast-msg {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;
}
.toast-x {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1;
}
.toast-x:hover { background: var(--bg-hover); color: var(--text); }

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.toast-move {
  transition: transform 0.22s ease;
}
</style>
