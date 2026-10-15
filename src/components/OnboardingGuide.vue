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
      </ol>

      <!-- Step 1: 选类型 -->
      <section v-if="step === 1" class="body">
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
      <section v-else class="body">
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
        </div>

        <div class="preview">
          <svg :viewBox="`0 0 ${paperW} ${paperH}`" preserveAspectRatio="xMidYMid meet" class="preview-svg">
            <rect x="0" y="0" :width="paperW" :height="paperH" fill="#f1f5f9" stroke="#cbd5e1" :stroke-width="Math.max(paperW, paperH) / 400" />
            <g v-for="cell in layoutCells" :key="cell.k">
              <rect
                :x="cell.x" :y="cell.y" :width="labelW" :height="labelH"
                fill="white" stroke="#3b82f6"
                :stroke-width="Math.max(paperW, paperH) / 600"
              />
            </g>
          </svg>
          <div class="preview-info">
            <div class="muted">{{ t('一张纸上可放') }}</div>
            <div class="big">{{ cols }} × {{ rows }} = <b>{{ cols * rows }}</b> <small>{{ t('张/页') }}</small></div>
            <div class="hint">{{ t('点「应用」即可在画布看到该模板') }}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn" @click="step = 1">← {{ t('上一步') }}</button>
          <button class="btn primary" @click="apply">{{ t('应用并开始') }} →</button>
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
import { autoMatchFieldMap, extractTemplateFields } from '../utils/render'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const project = useProjectStore()
const data = useDataStore()
const emit = defineEmits(['close'])

// 去重并排序，作为尺寸下拉的可选值
const uniq = (arr) => [...new Set(arr)].sort((a, b) => a - b)
const LABEL_W_PRESETS = uniq(LABEL_PRESETS.map(p => p.width))
const LABEL_H_PRESETS = uniq(LABEL_PRESETS.map(p => p.height))
// 纸张下拉 = 纸张预设 + 标签预设（用户可能直接拿小标签当"纸"打）
const PAPER_W_PRESETS = uniq([...PAPER_PRESETS.map(p => p.width), ...LABEL_PRESETS.map(p => p.width)])
const PAPER_H_PRESETS = uniq([...PAPER_PRESETS.map(p => p.height), ...LABEL_PRESETS.map(p => p.height)])

const step = ref(1)
const templates = BUILTIN_TEMPLATES
const pickedId = ref('')
const pickedTpl = ref(null)

const labelW = ref(60)
const labelH = ref(40)
const paperW = ref(100)
const paperH = ref(100)

const MARGIN = 3  // mm（沿用项目默认 sheetMargin）
const GAP = 2

const cols = computed(() => Math.max(1, Math.floor((paperW.value - MARGIN * 2 + GAP) / (labelW.value + GAP))))
const rows = computed(() => Math.max(1, Math.floor((paperH.value - MARGIN * 2 + GAP) / (labelH.value + GAP))))

const layoutCells = computed(() => {
  const cells = []
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < cols.value; c++) {
      cells.push({
        k: `${r}-${c}`,
        x: MARGIN + c * (labelW.value + GAP),
        y: MARGIN + r * (labelH.value + GAP)
      })
    }
  }
  return cells
})

function pick(tpl) {
  pickedId.value = tpl.id
  pickedTpl.value = tpl
  // 预填模板自带尺寸
  labelW.value = tpl.label.width
  labelH.value = tpl.label.height
  paperW.value = tpl.paper.width
  paperH.value = tpl.paper.height
  step.value = 2
}

function pickBlank() {
  pickedTpl.value = null
  labelW.value = 60
  labelH.value = 40
  paperW.value = 100
  paperH.value = 100
  apply()
}

function apply() {
  // 1) 应用模板（含 paper/label/margin/layout/components）
  if (pickedTpl.value) {
    project.applyTemplate(pickedTpl.value)
  }
  // 2) 覆盖尺寸（如果用户改过）
  const tpl = pickedTpl.value
  const dimsChanged = !tpl
    || labelW.value !== tpl.label.width || labelH.value !== tpl.label.height
    || paperW.value !== tpl.paper.width || paperH.value !== tpl.paper.height
  if (dimsChanged) {
    project.updateLabel({ width: labelW.value, height: labelH.value })
    project.updatePaper({ width: paperW.value, height: paperH.value })
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
  dismiss()
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
  background: var(--bg, #fff);
  color: var(--text-primary, #0f172a);
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
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.head h2 { font-size: 18px; margin: 0; }
.close {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted, #64748b);
  padding: 0 6px;
}
.close:hover { color: var(--text-primary, #0f172a); }

.step-bar {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 10px 20px;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted, #64748b);
  background: var(--bg-secondary, #f8fafc);
}
.step-bar li {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid var(--border, #e2e8f0);
}
.step-bar li.on { color: var(--text-primary, #0f172a); border-color: #cbd5e1; }
.step-bar li.cur {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.body { padding: 16px 20px 20px; overflow-y: auto; }
.tip { font-size: 13px; color: var(--text-secondary, #475569); margin: 0 0 12px; line-height: 1.6; }
.tip b { color: var(--text-primary, #0f172a); }

/* Step 1 模板网格 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.tpl {
  text-align: left;
  background: var(--bg, #fff);
  border: 1px solid var(--border, #e2e8f0);
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
.tpl:hover { border-color: #93c5fd; }
.tpl:active { transform: scale(0.99); }
.tpl.active { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18); }
.tpl-name { font-weight: 600; font-size: 14px; }
.tpl-group {
  display: inline-block;
  width: fit-content;
  font-size: 11px;
  color: #1d4ed8;
  background: #dbeafe;
  border-radius: 3px;
  padding: 1px 6px;
}
.tpl-desc { font-size: 12px; color: var(--text-secondary, #475569); line-height: 1.5; }
.tpl-fields { font-size: 11px; color: var(--text-muted, #64748b); margin-top: 2px; }
.tpl-fields span { color: var(--text-secondary, #475569); }
.tpl.blank { border-style: dashed; }
.tpl.blank .tpl-name { color: var(--text-muted, #64748b); }

/* Step 2 尺寸表单 */
.form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.row { display: flex; align-items: center; gap: 8px; }
.row label { width: 80px; color: var(--text-secondary, #475569); font-size: 13px; }
.row .input { width: 110px; }
.row .x { color: var(--text-muted, #64748b); }

.preview {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  background: var(--bg-secondary, #f8fafc);
}
.preview-svg {
  width: 200px;
  height: 160px;
  background: white;
  border-radius: 4px;
  flex-shrink: 0;
}
.preview-info { flex: 1; font-size: 13px; color: var(--text-secondary, #475569); }
.preview-info .muted { color: var(--text-muted, #64748b); margin-bottom: 4px; }
.preview-info .big { font-size: 20px; font-weight: 500; color: var(--text-primary, #0f172a); margin-bottom: 6px; }
.preview-info .big b { color: #3b82f6; font-weight: 700; font-size: 26px; }
.preview-info .big small { font-size: 12px; color: var(--text-muted, #64748b); margin-left: 4px; }
.preview-info .hint { font-size: 12px; color: var(--text-muted, #64748b); }

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}
.btn {
  padding: 6px 14px;
  border: 1px solid var(--border, #e2e8f0);
  background: var(--bg, #fff);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary, #0f172a);
}
.btn:hover { background: var(--bg-secondary, #f8fafc); }
.btn.primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}
.btn.primary:hover { background: #2563eb; }
</style>
