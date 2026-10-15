<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        📐 {{ t('纸张 & 标签 & 排版') }}
        <button class="btn btn-icon" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <!-- 标签尺寸（核心：数据单元大小） -->
        <fieldset>
          <legend>📦 {{ t('标签尺寸（每条数据的大小）') }}</legend>
          <div class="form-row">
            <label>{{ t('预设') }}</label>
            <select class="input" :value="labelPresetName" @change="applyLabelPreset($event)">
              <option value="">-- {{ t('选择预设') }} --</option>
              <option v-for="p in labelPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <label>{{ t('宽度 (mm)') }}</label>
            <input class="input" type="number" step="0.1" :value="form.label.width" @input="form.label.width = +$event.target.value" />
            <label>{{ t('高度 (mm)') }}</label>
            <input class="input" type="number" step="0.1" :value="form.label.height" @input="form.label.height = +$event.target.value" />
          </div>
          <div class="hint">
            {{ t('一条数据对应一个标签。所有组件的位置都是相对标签左上角的。') }}
          </div>
          <div class="form-row">
            <label>{{ t('背景') }}</label>
            <input class="input" type="color" :value="form.label.backgroundColor || '#ffffff'" @input="form.label.backgroundColor = $event.target.value" />
          </div>
          <div class="form-row">
            <label>{{ t('标签边框') }}</label>
            <div class="btn-group">
              <button class="btn btn-sm" :class="{active: !form.label.showBorder}" @click="form.label.showBorder = false">{{ t('无边框') }}</button>
              <button class="btn btn-sm" :class="{active: form.label.showBorder}" @click="form.label.showBorder = true">{{ t('显示边框') }}</button>
            </div>
          </div>
          <div v-if="form.label.showBorder" class="form-row">
            <label>{{ t('颜色') }}</label>
            <input class="input" type="color" :value="form.label.borderColor || '#000000'" @input="form.label.borderColor = $event.target.value" />
            <label>{{ t('粗细') }}</label>
            <input class="input" type="number" step="0.1" min="0.1" :value="form.label.borderWidth ?? 0.3" @input="form.label.borderWidth = +$event.target.value" />
          </div>
        </fieldset>

        <!-- 纸张（打印介质） -->
        <fieldset>
          <legend>📄 {{ t('纸张尺寸（打印介质）') }}</legend>
          <div class="form-row">
            <label>{{ t('预设') }}</label>
            <select class="input" :value="paperPresetName" @change="applyPaperPreset($event)">
              <option value="">-- {{ t('选择预设') }} --</option>
              <option v-for="p in paperPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <label>{{ t('宽度 (mm)') }}</label>
            <input class="input" type="number" :value="form.paper.width" @input="form.paper.width = +$event.target.value" />
            <label>{{ t('高度 (mm)') }}</label>
            <input class="input" type="number" :value="form.paper.height" @input="form.paper.height = +$event.target.value" />
          </div>
          <div class="form-row">
            <label>{{ t('背景') }}</label>
            <input class="input" type="color" :value="form.paper.backgroundColor" @input="form.paper.backgroundColor = $event.target.value" />
          </div>
        </fieldset>

        <!-- 纸张边距 -->
        <fieldset>
          <legend>{{ t('纸张边距 (mm) — 标签区到纸边的距离') }}</legend>
          <div class="form-row">
            <label>{{ t('上') }}</label><input class="input" type="number" :value="form.margin.top" @input="form.margin.top = +$event.target.value" />
            <label>{{ t('下') }}</label><input class="input" type="number" :value="form.margin.bottom" @input="form.margin.bottom = +$event.target.value" />
          </div>
          <div class="form-row">
            <label>{{ t('左') }}</label><input class="input" type="number" :value="form.margin.left" @input="form.margin.left = +$event.target.value" />
            <label>{{ t('右') }}</label><input class="input" type="number" :value="form.margin.right" @input="form.margin.right = +$event.target.value" />
          </div>
        </fieldset>

        <!-- 排版 -->
        <fieldset>
          <legend>🧩 {{ t('排版方式') }}</legend>
          <div class="form-row">
            <label>{{ t('模式') }}</label>
            <div class="btn-group">
              <button class="btn btn-sm" :class="{active: form.layout.mode === 'single'}"
                @click="form.layout.mode = 'single'">{{ t('单张（每页一个标签）') }}</button>
              <button class="btn btn-sm" :class="{active: form.layout.mode === 'auto'}"
                @click="form.layout.mode = 'auto'">{{ t('自动排版（每页多个）') }}</button>
            </div>
          </div>

          <div v-if="form.layout.mode === 'auto'">
            <div class="form-row">
              <label>{{ t('尺寸方式') }}</label>
              <div class="btn-group">
                <button class="btn btn-sm" :class="{active: form.layout.sizingMode === 'auto'}"
                  @click="form.layout.sizingMode = 'auto'">{{ t('按标签尺寸自动') }}</button>
                <button class="btn btn-sm" :class="{active: form.layout.sizingMode === 'manual'}"
                  @click="form.layout.sizingMode = 'manual'">{{ t('按行列计算') }}</button>
              </div>
            </div>

            <div v-if="form.layout.sizingMode === 'manual'">
              <div class="form-row">
                <label>{{ t('每行') }}</label><input class="input" type="number" min="1" :value="form.layout.cols" @input="form.layout.cols = +$event.target.value" />
                <label>{{ t('每列') }}</label><input class="input" type="number" min="1" :value="form.layout.rows" @input="form.layout.rows = +$event.target.value" />
              </div>
              <div class="hint">
                {{ t('共 {a} × {b} = {c} 个/页', { a: form.layout.cols, b: form.layout.rows, c: form.layout.cols * form.layout.rows }) }}
              </div>
            </div>
            <div v-else class="hint">
              {{ t('按 标签 {a}×{b}mm 在纸张 {c}×{d}mm 上自动排布：', { a: form.label.width, b: form.label.height, c: form.paper.width, d: form.paper.height }) }}
              <b>{{ t('{a} × {b} = {c} 个/页', { a: previewGrid.cols, b: previewGrid.rows, c: previewGrid.cols * previewGrid.rows }) }}</b>
            </div>

            <div class="form-row">
              <label>{{ t('水平间距') }}</label><input class="input" type="number" :value="form.layout.hGap" @input="form.layout.hGap = +$event.target.value" />
              <label>{{ t('垂直间距') }}</label><input class="input" type="number" :value="form.layout.vGap" @input="form.layout.vGap = +$event.target.value" />
            </div>
          </div>
        </fieldset>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="$emit('close')">{{ t('取消') }}</button>
        <button class="btn btn-primary" @click="apply">{{ t('应用') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useProjectStore, PAPER_PRESETS, LABEL_PRESETS } from '../stores/project'
import { useI18n } from '../utils/i18n'

const { t } = useI18n()
const project = useProjectStore()
const paperPresets = PAPER_PRESETS
const labelPresets = LABEL_PRESETS

const form = reactive(JSON.parse(JSON.stringify(project.project)))

// 预设回显：当前宽高与预设精确匹配时选中（容差 0.01mm），手动改宽高自动回落
function matchPreset(list, w, h) {
  return (list.find(p => Math.abs(p.width - w) < 0.01 && Math.abs(p.height - h) < 0.01) || {}).name || ''
}
const labelPresetName = computed(() => matchPreset(labelPresets, form.label.width, form.label.height))
const paperPresetName = computed(() => matchPreset(paperPresets, form.paper.width, form.paper.height))

// auto 模式下实时预览能排多少个标签
const previewGrid = computed(() => {
  if (form.layout.sizingMode !== 'auto') {
    return { cols: Math.max(1, form.layout.cols || 1), rows: Math.max(1, form.layout.rows || 1) }
  }
  const aw = form.paper.width - form.margin.left - form.margin.right
  const ah = form.paper.height - form.margin.top - form.margin.bottom
  const lw = Math.max(1, form.label.width)
  const lh = Math.max(1, form.label.height)
  const hGap = Math.max(0, form.layout.hGap || 0)
  const vGap = Math.max(0, form.layout.vGap || 0)
  return {
    cols: Math.max(1, Math.floor((aw + hGap) / (lw + hGap))),
    rows: Math.max(1, Math.floor((ah + vGap) / (lh + vGap)))
  }
})

function applyPaperPreset(e) {
  const name = e.target.value
  const p = paperPresets.find(p => p.name === name)
  if (!p) return
  form.paper.width = p.width
  form.paper.height = p.height
}

function applyLabelPreset(e) {
  const name = e.target.value
  const p = labelPresets.find(p => p.name === name)
  if (!p) return
  form.label.width = p.width
  form.label.height = p.height
}

function apply() {
  // 直接走 store 的 helper，auto 模式下 cols/rows 由 store 重算
  project.updatePaper({ ...form.paper })
  project.updateMargin({ ...form.margin })
  project.updateLabel({ ...form.label })
  const l = { ...form.layout }
  if (l.sizingMode === 'auto') {
    // 不传快照中的 cols/rows，避免覆盖计算结果
    delete l.cols
    delete l.rows
  }
  project.updateLayout(l)
  emit('close')
}

const emit = defineEmits(['close'])
</script>

<style scoped>
fieldset { border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; margin-bottom: 12px; }
legend { padding: 0 6px; font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.btn-group { display: flex; gap: 2px; }
.btn-group .btn.active { background: var(--primary); color: white; border-color: var(--primary); }
.hint { font-size: 11px; color: var(--text-muted); margin: 4px 0 0; }
</style>
