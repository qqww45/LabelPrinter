<template>
  <div
    ref="root"
    class="gate"
    role="dialog"
    aria-modal="true"
    aria-labelledby="gate-title"
    @keydown="onKeydown"
  >
    <div class="grain" aria-hidden="true"></div>
    <button class="gate-close" type="button" :aria-label="t('关闭')" @click="skip">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.6" />
      </svg>
    </button>

    <div class="frame" :class="step">
      <div :key="step" class="story">
        <template v-if="step === 'about'">
          <p class="kicker"><span>01</span>{{ t('这是什么') }}</p>
          <h1 id="gate-title">{{ t('这是一台标签印刷台') }}</h1>
          <p class="lede">{{ t('把表格里的每一行，印成一张可以贴出去的标签。') }}</p>
          <p class="body-copy">
            {{ t('不用安装。你在浏览器里画好一张标签的样子，再把 Excel 或 CSV 导进来，每一行就会填上品名、价格、条码或地址。') }}
          </p>

          <ul class="scenes">
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7.5h10.5L20 12v8.5H4v-13z" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M14 7.5V12h6" fill="none" stroke="currentColor" stroke-width="1.6" />
              </svg>
              <span>
                <strong>{{ t('价签') }}</strong>
                <em>{{ t('货架上的品名、价格和条码') }}</em>
              </span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 8h11v9H3zM14 10h4l3 3v4h-7" fill="none" stroke="currentColor" stroke-width="1.6" />
                <circle cx="7" cy="18.5" r="1.4" fill="currentColor" />
                <circle cx="17" cy="18.5" r="1.4" fill="currentColor" />
              </svg>
              <span>
                <strong>{{ t('快递面单') }}</strong>
                <em>{{ t('收件人、电话和地址，一批打出来') }}</em>
              </span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.6" />
                <rect x="13" y="4" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.6" />
                <rect x="4" y="13" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M13 16.5h7M16.5 13v7" fill="none" stroke="currentColor" stroke-width="1.6" />
              </svg>
              <span>
                <strong>{{ t('资产贴') }}</strong>
                <em>{{ t('编号和二维码，扫码就能盘点') }}</em>
              </span>
            </li>
          </ul>

          <ol class="beats">
            <li><b>1</b>{{ t('设计一张样子') }}</li>
            <li><b>2</b>{{ t('导入一张表格') }}</li>
            <li><b>3</b>{{ t('打印或导出 PDF') }}</li>
          </ol>

          <p class="quiet">{{ t('开源工具，数据只留在这台浏览器里。把网址发给别人，对方也能用。') }}</p>

          <div class="actions">
            <button class="text-btn" type="button" @click="skip">{{ t('先自己看看') }}</button>
            <button ref="primaryBtn" class="go" type="button" @click="goCreate">{{ t('下一步，建立项目') }}</button>
          </div>
        </template>

        <template v-else>
          <p class="kicker"><span>02</span>{{ t('建立项目') }}</p>
          <h1 id="gate-title">{{ t('给这份活起个名字') }}</h1>
          <p class="lede">{{ t('一个项目只做一种标签。价签和面单请分开建，样子和表格都留在这个项目里。') }}</p>
          <p class="body-copy">{{ t('起好名字后，会带你选一个接近的样子，并确认要印在多大的纸上。') }}</p>

          <form class="name-form" @submit.prevent="submit">
            <label for="first-project-name">{{ t('项目名称') }}</label>
            <input
              id="first-project-name"
              ref="nameInput"
              v-model="name"
              class="name-input"
              maxlength="40"
              autocomplete="off"
              spellcheck="false"
              :placeholder="t('例如：门店价签')"
            />
            <p class="suggest-label">{{ t('也可以直接用这些名字') }}</p>
            <div class="suggests" role="group" :aria-label="t('也可以直接用这些名字')">
              <button
                v-for="item in suggestions"
                :key="item"
                type="button"
                class="suggest"
                :aria-pressed="name === t(item)"
                @click="pickSuggestion(t(item))"
              >{{ t(item) }}</button>
            </div>
            <div class="actions">
              <button class="text-btn" type="button" @click="back">{{ t('返回') }}</button>
              <button class="go" type="submit" :disabled="!cleanName">{{ t('创建项目') }}</button>
            </div>
          </form>
        </template>
      </div>

      <aside v-if="step === 'about'" class="specimen" aria-hidden="true">
        <div class="stack">
          <div class="sheet sheet-back"></div>
          <div class="sheet sheet-mid"></div>
          <div class="sheet sheet-front">
            <div class="sheet-kicker">
              <span>ROW 01</span>
              <span>60 × 40 mm</span>
            </div>
            <div class="table-bit">
              <span>{{ t('品名') }}</span>
              <span>{{ t('价格') }}</span>
              <span>{{ t('条码') }}</span>
              <b>{{ t('红富士苹果') }}</b>
              <b>12.80</b>
              <b>6901234567892</b>
            </div>
            <div class="become">{{ t('表格的一行，变成一张标签') }}</div>
            <div class="tag">
              <div class="crop tl"></div>
              <div class="crop tr"></div>
              <div class="crop bl"></div>
              <div class="crop br"></div>
              <div class="tag-kind">{{ t('生鲜') }}</div>
              <div class="tag-name">{{ t('红富士苹果') }}</div>
              <div class="tag-spec">{{ t('一级 · 500g') }}</div>
              <div class="tag-price"><small>¥</small>12.80</div>
              <div class="bars">
                <i v-for="(w, i) in bars" :key="i" :style="{ width: w + 'px' }"></i>
              </div>
              <div class="tag-code">6901234 567892</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const emit = defineEmits(['skip', 'create'])

const step = ref('about')
const name = ref('')
const root = ref(null)
const nameInput = ref(null)
const primaryBtn = ref(null)
const suggestions = ['门店价签', '快递面单', '资产标签', '仓库条码']
const bars = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 2, 2, 1]

const cleanName = computed(() => name.value.trim())

function skip() {
  emit('skip')
}

function goCreate() {
  step.value = 'create'
}

function back() {
  step.value = 'about'
}

function pickSuggestion(label) {
  name.value = label
  nameInput.value?.focus()
}

function submit() {
  if (!cleanName.value) return
  emit('create', cleanName.value)
}

function focusables() {
  const rootEl = root.value
  if (!rootEl) return []
  return [...rootEl.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.disabled && el.tabIndex !== -1)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    if (step.value === 'create') back()
    else skip()
    return
  }
  if (e.key !== 'Tab') return
  const list = focusables()
  if (!list.length) return
  const first = list[0]
  const last = list[list.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(step, async (next) => {
  await nextTick()
  root.value?.scrollTo({ top: 0 })
  if (next === 'create') nameInput.value?.focus({ preventScroll: true })
  else primaryBtn.value?.focus({ preventScroll: true })
})

onMounted(() => {
  primaryBtn.value?.focus({ preventScroll: true })
})
</script>

<style scoped>
.gate {
  --press: "Palatino Linotype", Palatino, "Songti SC", "STSong", SimSun, serif;
  position: fixed;
  inset: 0;
  z-index: 10000;
  overflow: auto;
  overscroll-behavior: contain;
  color: var(--text);
  background:
    radial-gradient(900px 520px at 8% -10%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 62%),
    radial-gradient(700px 480px at 110% 110%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 60%),
    var(--bg);
}

.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.45;
  background-image:
    linear-gradient(color-mix(in srgb, var(--text) 7%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--text) 7%, transparent) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse at 72% 42%, #000 0%, transparent 72%);
}

.gate-close {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-panel);
  color: var(--text-secondary);
}
.gate-close:hover { color: var(--text); border-color: var(--text-muted); }
.gate-close:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.frame {
  position: relative;
  z-index: 1;
  width: min(1120px, calc(100% - 48px));
  min-height: 100%;
  margin: 0 auto;
  padding: 64px 0 48px;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 48px;
  align-items: center;
}
.frame.create {
  grid-template-columns: minmax(0, 640px);
  justify-content: center;
}

.kicker {
  margin: 0 0 14px;
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.kicker span {
  margin-right: 10px;
  color: var(--primary);
  font-weight: 700;
  letter-spacing: 0.08em;
}

h1 {
  margin: 0;
  max-width: 12em;
  font-family: var(--press);
  font-size: clamp(40px, 5vw, 64px);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.03em;
}

.lede {
  margin: 18px 0 0;
  max-width: 36em;
  font-size: 18px;
  line-height: 1.55;
  color: var(--text);
}

.body-copy {
  margin: 12px 0 0;
  max-width: 40em;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.scenes {
  list-style: none;
  margin: 28px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.scenes li {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-panel) 86%, transparent);
}
.scenes svg {
  width: 28px;
  height: 28px;
  color: var(--primary);
}
.scenes strong,
.scenes em {
  display: block;
  font-style: normal;
}
.scenes strong { font-size: 14px; }
.scenes em {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.45;
}

.beats {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 22px 0 0;
  padding: 0;
  font-size: 13px;
}
.beats li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.beats b {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--text);
  color: var(--bg);
  font-size: 11px;
  font-weight: 700;
}

.quiet {
  margin: 18px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px 18px;
  margin-top: 28px;
}

.text-btn {
  min-height: 44px;
  padding: 0 4px;
  color: var(--text-secondary);
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.text-btn:hover { color: var(--text); }
.text-btn:focus-visible,
.go:focus-visible,
.suggest:focus-visible,
.name-input:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

.go {
  min-height: 44px;
  padding: 0 22px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 15px;
  font-weight: 650;
}
.go:hover:not(:disabled) { background: var(--primary-hover); }
.go:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.name-form { margin-top: 28px; }
.name-form label,
.suggest-label {
  display: block;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}
.name-input {
  width: 100%;
  margin-top: 8px;
  padding: 8px 0 12px;
  border: none;
  border-bottom: 2px solid var(--text);
  border-radius: 0;
  background: transparent;
  font-family: var(--press);
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.2;
  color: var(--text);
}
.name-input::placeholder { color: var(--text-muted); }
.suggest-label { margin: 22px 0 8px; }
.suggests { display: flex; flex-wrap: wrap; gap: 8px; }
.suggest {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-panel);
  color: var(--text);
  font-size: 13px;
}
.suggest:hover { border-color: var(--primary); }
.suggest[aria-pressed="true"] {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, var(--bg-panel));
  color: var(--primary);
  font-weight: 650;
}

.specimen { display: flex; justify-content: center; }
.stack {
  position: relative;
  width: min(100%, 380px);
  transform: rotate(-1.75deg);
  animation: stack-in 0.85s cubic-bezier(.16, 1, .3, 1) 0.12s both;
}
.sheet {
  border: 1px solid color-mix(in srgb, #0f172a 12%, transparent);
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
}
.sheet-back,
.sheet-mid {
  position: absolute;
  inset: 14px -10px auto auto;
  width: 92%;
  height: 86%;
}
.sheet-back { transform: rotate(4.5deg); background: #f4f1ea; }
.sheet-mid { transform: rotate(2.2deg) translate(8px, 8px); background: #fbfaf7; }
.sheet-front {
  position: relative;
  padding: 16px 16px 18px;
  color: #1c1917;
}
.sheet-kicker {
  display: flex;
  justify-content: space-between;
  font-family: var(--press);
  font-size: 11px;
  letter-spacing: 0.16em;
  color: #78716c;
}
.table-bit {
  display: grid;
  grid-template-columns: 1.3fr 0.6fr 1.1fr;
  gap: 4px 8px;
  margin-top: 12px;
  padding: 8px;
  background: #faf7f2;
  font-size: 11px;
}
.table-bit span { color: #78716c; }
.table-bit b { font-weight: 650; }
.become {
  margin: 10px 0;
  font-family: var(--press);
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #44403c;
}
.tag {
  position: relative;
  padding: 16px 14px 12px;
  border: 1px solid #e7e5e4;
  background:
    linear-gradient(#fff, #fff) padding-box,
    repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(37, 99, 235, 0.16) 7px, rgba(37, 99, 235, 0.16) 8px);
}
.crop {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 0 solid var(--primary);
}
.crop.tl { top: 4px; left: 4px; border-top-width: 1.5px; border-left-width: 1.5px; }
.crop.tr { top: 4px; right: 4px; border-top-width: 1.5px; border-right-width: 1.5px; }
.crop.bl { bottom: 4px; left: 4px; border-bottom-width: 1.5px; border-left-width: 1.5px; }
.crop.br { bottom: 4px; right: 4px; border-bottom-width: 1.5px; border-right-width: 1.5px; }
.tag-kind {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: #78716c;
}
.tag-name {
  margin-top: 4px;
  font-family: var(--press);
  font-size: 28px;
  line-height: 1.1;
}
.tag-spec { margin-top: 2px; font-size: 12px; color: #57534e; }
.tag-price {
  margin: 8px 0 10px;
  font-family: var(--press);
  font-size: 42px;
  line-height: 0.9;
  color: #b91c1c;
  letter-spacing: -0.04em;
}
.tag-price small { margin-right: 2px; font-size: 18px; }
.bars {
  display: flex;
  align-items: stretch;
  gap: 1px;
  height: 42px;
}
.bars i { display: block; background: #141414; }
.tag-code {
  margin-top: 3px;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-align: center;
  color: #292524;
}

.story > * {
  animation: rise 0.7s cubic-bezier(.16, 1, .3, 1) both;
}
.story > *:nth-child(1) { animation-delay: 0.02s; }
.story > *:nth-child(2) { animation-delay: 0.08s; }
.story > *:nth-child(3) { animation-delay: 0.14s; }
.story > *:nth-child(4) { animation-delay: 0.2s; }
.story > *:nth-child(5) { animation-delay: 0.26s; }
.story > *:nth-child(6) { animation-delay: 0.32s; }

@keyframes rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
@keyframes stack-in {
  from { opacity: 0; transform: rotate(-1.75deg) translateY(18px); }
  to { opacity: 1; transform: rotate(-1.75deg) translateY(0); }
}

@media (max-width: 860px) {
  .frame {
    grid-template-columns: 1fr;
    width: min(100% - 32px, 720px);
    padding-top: 64px;
    gap: 28px;
  }
  .specimen { order: -1; }
  .stack { width: min(100%, 300px); }
  h1 { font-size: 36px; }
}

@media (max-height: 720px) {
  .frame { padding-top: 52px; padding-bottom: 20px; gap: 16px; }
  .specimen { display: none; }
  h1 { font-size: 32px; }
  .lede { margin-top: 10px; font-size: 16px; }
  .body-copy, .scenes { margin-top: 10px; }
  .scenes { gap: 6px; }
  .scenes li { padding: 7px 10px; }
  .beats, .quiet, .actions { margin-top: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .story > *,
  .stack { animation: none; }
}

@media (forced-colors: active) {
  .sheet,
  .tag,
  .suggest,
  .go {
    border: 1px solid CanvasText;
  }
}
</style>
