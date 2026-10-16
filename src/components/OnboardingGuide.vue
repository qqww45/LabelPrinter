<template>
  <div class="onboarding-mask">
    <div class="onboarding-card">
      <header class="head">
        <h2>👋 {{ t('开始制作你的第一个标签') }}</h2>
        <button class="close" @click="dismiss" :title="t('稍后再说')">×</button>
      </header>

      <ol class="step-bar">
        <li :class="{ on: step >= 1, cur: step === 1 }"><b>①</b> {{ t('选个类型') }}</li>
        <li :class="{ on: step >= 2, cur: step === 2 }"><b>②</b> {{ t('确认尺寸') }}</li>
        <li :class="{ on: step >= 3, cur: step === 3 }"><b>③</b> {{ t('导入数据') }}</li>
      </ol>

      <!-- Step 1: 选类型 -->
      <section v-if="step === 1" class="body step-enter">
        <p class="tip">{{ t('选一个最像的开始 —— 后面所有元素、尺寸、文字都能改。') }}</p>
        <div class="grid">
          <button
            v-for="tpl in templates"
            :key="tpl.id"
            class="tpl"
            :class="{ active: pickedId === tpl.id }"
            @click="pick(tpl)"
          >
            <div class="tpl-name">{{ tpl.name }}</div>
            <div class="tpl-group">{{ tpl.group }}</div>
            <div class="tpl-desc">{{ tpl.desc }}</div>
            <div v-if="tpl.fields?.length" class="tpl-fields">
              <span>{{ t('字段：') }}</span>{{ tpl.fields.join(' / ') }}
            </div>
          </button>
          <button class="tpl blank" @click="pickBlank">
            <div class="tpl-name">🪶 {{ t('空白开始') }}</div>
            <div class="tpl-desc">{{ t('什么元素都没有，自己从左侧组件面板拖入') }}</div>
          </button>
        </div>
      </section>

      <!-- Step 2: 确认尺寸 -->
      <section v-else-if="step === 2" class="body step-enter">
        <p class="tip">
          {{ t('两套尺寸是不同概念：') }}<b>{{ t('标签') }}</b>{{ t('=每条数据一个，') }}<b>{{ t('纸张') }}</b>{{ t('=实际打印的纸。') }}
        </p>
        <div class="form">
          <div class="row">
            <label>{{ t('标签尺寸') }}</label>
            <select class="input" v-model.number="labelW">
              <option v-for="o in LABEL_W_PRESETS" :key="o" :value="o">{{ o }} mm</option>
            </select>
            <span class="x">×</span>
            <select class="input" v-model.number="labelH">
              <option v-for="o in LABEL_H_PRESETS" :key="o" :value="o">{{ o }} mm</option>
            </select>
          </div>
          <div class="row">
            <label>{{ t('纸张尺寸') }}</label>
            <select class="input" v-model.number="paperW">
              <option v-for="o in PAPER_W_PRESETS" :key="o" :value="o">{{ o }} mm</option>
            </select>
            <span class="x">×</span>
            <select class="input" v-model.number="paperH">
              <option v-for="o in PAPER_H_PRESETS" :key="o" :value="o">{{ o }} mm</option>
            </select>
          </div>
          <!-- 一键选常见尺寸：A4/A5/Letter + 常见标签纸（一般人不记得具体 mm） -->
          <div class="row">
            <label>{{ t('常用尺寸') }}</label>
            <div class="chips">
              <button
                v-for="p in PAPER_QUICK_PRESETS" :key="p.name"
                type="button"
                :class="['chip', isPaperPicked(p) && 'on']"
                :title="p.name + ' · ' + p.w + '×' + p.h + ' mm'"
                @click="applyPaperPreset(p)"
              >
                <span>{{ p.name }}</span>
                <span class="chip-size">{{ p.w }}×{{ p.h }}</span>
              </button>
            </div>
          </div>
          <div class="row">
            <label>{{ t('纸张边距') }}</label>
            <input
              class="input" type="number" min="0" max="20" step="0.5"
              v-model.number="marginMm"
            />
            <span class="unit">mm（{{ t('标签距纸边的留白') }}）</span>
          </div>
        </div>

        <div v-if="tooBig" class="warn">
          ⚠ {{ t('放不下：') }}{{ labelW }}×{{ labelH }} {{ t('的标签加上左右各') }} {{ marginMm }}mm {{ t('边距，超出了') }} {{ paperW }}×{{ paperH }} {{ t('的纸。') }}<br>
          {{ t('纸张至少要') }} <b>{{ minPaper.w }}×{{ minPaper.h }}mm</b>{{ t(' —— 请换更大的纸、缩小标签，或把边距调为 0，否则打印会被裁掉。') }}
        </div>

        <div class="preview">
          <svg :viewBox="`0 0 ${paperW} ${paperH}`" preserveAspectRatio="xMidYMid meet" class="preview-svg">
            <rect x="0" y="0" :width="paperW" :height="paperH" fill="#f1f5f9" stroke="#cbd5e1" :stroke-width="Math.max(paperW, paperH) / 400" />
            <g v-for="cell in layoutCells" :key="cell.k">
              <rect
                :x="cell.x" :y="cell.y" :width="labelW" :height="labelH"
                fill="white" :stroke="tooBig ? '#ef4444' : '#3b82f6'"
                :stroke-width="Math.max(paperW, paperH) / 600"
              />
            </g>
          </svg>
          <div class="preview-info">
            <div class="muted">{{ t('一张纸上可放') }}</div>
            <div class="big">{{ cols }} × {{ rows }} = <b>{{ cols * rows }}</b> <small>{{ t('张/页') }}</small></div>
            <div v-if="tooBig" class="hint bad">{{ t('当前组合打印会裁掉边缘，请调整') }}</div>
            <div v-else class="hint">{{ t('点「下一步」把这个尺寸放到画布上') }}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn" @click="step = 1">← {{ t('上一步') }}</button>
          <button class="btn btn-primary" :disabled="tooBig" @click="goImportStep">{{ t('下一步') }} →</button>
        </div>
      </section>

      <!-- Step 3: 导入数据 -->
      <section v-else class="body step-enter">
        <p class="tip">{{ t('有数据才能批量打。Excel 或 CSV 的第一行是列名，和模板里的字段同名会自动对上。') }}</p>
        <p class="tip muted">{{ t('也可以先加载一份示例数据，马上预览打印效果。') }}</p>
        <div class="sample-row">
          <button
            v-for="s in sampleSets"
            :key="s.id"
            class="btn btn-sm sample-btn"
            type="button"
            @click="emit('load-sample', s.id)"
          >{{ t(s.name) }}</button>
        </div>
        <div class="actions">
          <button class="btn" @click="step = 2">← {{ t('上一步') }}</button>
          <button class="btn" @click="dismiss">{{ t('先跳过，稍后在底部导入') }}</button>
          <button class="btn btn-primary" @click="emit('import')">{{ t('现在导入') }}</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProjectStore, LABEL_PRESETS, PAPER_PRESETS } from '../stores/project'
import { useDataStore } from '../stores/data'
import { BUILTIN_TEMPLATES } from '../utils/templates'
import { SAMPLE_DATASETS } from '../utils/samples'
import { autoMatchFieldMap, extractTemplateFields } from '../utils/render'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const project = useProjectStore()
const data = useDataStore()
const emit = defineEmits(['close', 'import', 'load-sample'])
const sampleSets = SAMPLE_DATASETS

// 去重并排序，作为尺寸下拉的可选值
const uniq = (arr) => [...new Set(arr)].sort((a, b) => a - b)
const LABEL_W_PRESETS = uniq(LABEL_PRESETS.map(p => p.width))
const LABEL_H_PRESETS = uniq(LABEL_PRESETS.map(p => p.height))
// 纸张下拉 = 纸张预设 + 标签预设（用户可能直接拿小标签当"纸"打）
const PAPER_W_PRESETS = uniq([...PAPER_PRESETS.map(p => p.width), ...LABEL_PRESETS.map(p => p.width)])
const PAPER_H_PRESETS = uniq([...PAPER_PRESETS.map(p => p.height), ...LABEL_PRESETS.map(p => p.height)])

const step = ref(1)

// 纸张一键预设（不重复 -- 下拉里有的就不列了；这里放 A 系列 + Letter + 常用标签纸）
const PAPER_QUICK_PRESETS = [
  { name: 'A4',     w: 210,   h: 297 },
  { name: 'A5',     w: 148,   h: 210 },
  { name: 'A6',     w: 105,   h: 148 },
  { name: 'Letter', w: 215.9, h: 279.4 },
  { name: '100×100', w: 100,  h: 100 },
  { name: '80×50',  w: 80,    h: 50 },
  { name: '60×40',  w: 60,    h: 40 },
  { name: '50×30',  w: 50,    h: 30 }
]

function applyPaperPreset(p) {
  paperW.value = p.w
  paperH.value = p.h
}

function isPaperPicked(p) {
  return paperW.value === p.w && paperH.value === p.h
}
const templates = BUILTIN_TEMPLATES
const pickedId = ref('')
const pickedTpl = ref(null)

const labelW = ref(60)
const labelH = ref(40)
const paperW = ref(100)
const paperH = ref(100)

const GAP = 2

// 纸张边距（mm）——预填模板值，可调；四边对称，简化理解
const marginMm = ref(3)

// 放不放得下：标签 + 左右边距 ≤ 纸张（容差 0.01 避免浮点误判）
const fitsW = computed(() => labelW.value + marginMm.value * 2 <= paperW.value + 0.01)
const fitsH = computed(() => labelH.value + marginMm.value * 2 <= paperH.value + 0.01)
const tooBig = computed(() => !fitsW.value || !fitsH.value)
const minPaper = computed(() => ({
  w: Math.ceil((labelW.value + marginMm.value * 2) * 10) / 10,
  h: Math.ceil((labelH.value + marginMm.value * 2) * 10) / 10
}))

const cols = computed(() => Math.max(1, Math.floor((paperW.value - marginMm.value * 2 + GAP) / (labelW.value + GAP))))
const rows = computed(() => Math.max(1, Math.floor((paperH.value - marginMm.value * 2 + GAP) / (labelH.value + GAP))))

const layoutCells = computed(() => {
  const cells = []
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < cols.value; c++) {
      cells.push({
        k: `${r}-${c}`,
        x: marginMm.value + c * (labelW.value + GAP),
        y: marginMm.value + r * (labelH.value + GAP)
      })
    }
  }
  return cells
})

function pick(tpl) {
  pickedId.value = tpl.id
  pickedTpl.value = tpl
  // 预填模板自带尺寸与边距
  labelW.value = tpl.label.width
  labelH.value = tpl.label.height
  paperW.value = tpl.paper.width
  paperH.value = tpl.paper.height
  marginMm.value = Math.max(0, Number(tpl.margin?.left ?? 3))
  step.value = 2
}

function pickBlank() {
  pickedTpl.value = null
  pickedId.value = ''
  labelW.value = 60
  labelH.value = 40
  paperW.value = 100
  paperH.value = 100
  marginMm.value = 3
  step.value = 2
}

function goImportStep() {
  if (tooBig.value) return
  commitLayout()
  step.value = 3
}

function commitLayout() {
  // 1) 应用模板（含 paper/label/margin/layout/components）
  if (pickedTpl.value) {
    project.applyTemplate(pickedTpl.value)
  }
  // 2) 覆盖尺寸 / 边距（如果用户改过）
  const tpl = pickedTpl.value
  const tplMargin = tpl ? Math.max(0, Number(tpl.margin?.left ?? 3)) : 3
  const dimsChanged = !tpl
    || labelW.value !== tpl.label.width || labelH.value !== tpl.label.height
    || paperW.value !== tpl.paper.width || paperH.value !== tpl.paper.height
    || marginMm.value !== tplMargin
  if (dimsChanged) {
    project.updateLabel({ width: labelW.value, height: labelH.value })
    project.updatePaper({ width: paperW.value, height: paperH.value })
    project.updateMargin({ top: marginMm.value, right: marginMm.value, bottom: marginMm.value, left: marginMm.value })
    const perPage = cols.value * rows.value
    project.updateLayout({
      mode: perPage > 1 ? 'auto' : 'single',
      cols: cols.value,
      rows: rows.value,
      hGap: GAP,
      vGap: GAP,
      sizingMode: 'auto'
    })
  }
  // 3) 自动建立字段映射（同名匹配，不覆盖已有）
  if (pickedTpl.value && data.fields.length) {
    const tplFields = pickedTpl.value.fields?.length
      ? pickedTpl.value.fields
      : extractTemplateFields(pickedTpl.value.components)
    project.updateFieldMap(autoMatchFieldMap(tplFields, data.fields, project.project.dataSource.fieldMap || {}))
  }
}

function dismiss() {
  emit('close')
}
</script>

<style scoped>
.onboarding-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}
.onboarding-card {
  background: var(--bg-panel);
  color: var(--text);
  width: min(820px, 92%);
  max-height: 86vh;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
  border-bottom: 1px solid var(--border);
}
.head h2 { font-size: 18px; margin: 0; }
.close {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted);
  padding: 0 6px;
}
.close:hover { color: var(--text); }

.step-bar {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 10px 20px;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-hover);
}
.step-bar li {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid var(--border);
}
.step-bar li.on { color: var(--text); border-color: var(--border); }
.step-bar li.cur {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.body { padding: 16px 20px 20px; overflow-y: auto; }
.tip { font-size: 13px; color: var(--text-secondary); margin: 0 0 12px; line-height: 1.6; }
.tip.muted { color: var(--text-muted); margin-top: -4px; }
.tip b { color: var(--text); }
.sample-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 16px;
}
.sample-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.unit { color: var(--text-muted); font-size: 12px; }

/* 放不下警告（红/橙跟随 --danger / --warning，暗色下自动调亮） */
.warn {
  border: 1px solid var(--danger);
  background: rgba(239, 68, 68, 0.10);
  color: var(--danger);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 12px;
}
.warn b { color: var(--danger); }
.hint.bad { color: var(--danger); font-weight: 600; }

/* Step 1 模板网格 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.tpl {
  text-align: left;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.05s;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: inherit;
  font: inherit;
}
.tpl:hover { border-color: var(--primary); }
.tpl:active { transform: scale(0.99); }
.tpl.active { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25); }
.tpl-name { font-weight: 600; font-size: 14px; }
.tpl-group {
  display: inline-block;
  width: fit-content;
  font-size: 11px;
  color: var(--primary);
  background: rgba(37, 99, 235, 0.12);
  border-radius: 3px;
  padding: 1px 6px;
}
.tpl-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
.tpl-fields { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.tpl-fields span { color: var(--text-secondary); }
.tpl.blank { border-style: dashed; }
.tpl.blank .tpl-name { color: var(--text-muted); }

/* Step 2 尺寸表单 */
.form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.row label { width: 80px; color: var(--text-secondary); font-size: 13px; }
.row .input { width: 110px; background: var(--bg-panel); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 4px 6px; }
.row .x { color: var(--text-muted); }

/* 纸张尺寸一键预设：补全 A4/A5/A6/Letter 等常识 */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}
.chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-panel);
  color: var(--text);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  line-height: 1.3;
  min-width: 60px;
}
.chip:hover { border-color: var(--primary); background: var(--bg-hover); }
.chip.on {
  border-color: var(--primary);
  background: rgba(37, 99, 235, 0.12);
  color: var(--primary);
  font-weight: 600;
}
.chip .chip-size { font-size: 10px; color: var(--text-muted); font-weight: normal; }
.chip.on .chip-size { color: var(--primary); opacity: 0.7; }

/* 预览图：纸张始终白底（这是打印纸），卡片自身跟随主题 */
.preview {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-hover);
}
.preview-svg {
  width: 200px;
  height: 160px;
  background: #ffffff;
  border-radius: 4px;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px var(--border);
}
.preview-info { flex: 1; font-size: 13px; color: var(--text-secondary); }
.preview-info .muted { color: var(--text-muted); margin-bottom: 4px; }
.preview-info .big { font-size: 20px; font-weight: 500; color: var(--text); margin-bottom: 6px; }
.preview-info .big b { color: var(--primary); font-weight: 700; font-size: 26px; }
.preview-info .big small { font-size: 12px; color: var(--text-muted); margin-left: 4px; }
.preview-info .hint { font-size: 12px; color: var(--text-muted); }

.actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
}
.btn:hover:not(:disabled) { background: var(--bg-hover); }
.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.btn-primary:hover:not(:disabled) { background: var(--primary-hover); }
.btn:disabled,
.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}
.step-enter {
  animation: onboard-in 0.28s ease both;
}
@keyframes onboard-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .step-enter { animation: none; }
}
</style>
