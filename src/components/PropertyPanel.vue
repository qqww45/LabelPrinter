<template>
  <div class="property-panel">
    <div v-if="!selected && !isMultiSelect" class="empty">
      <div style="font-size:32px;opacity:0.3">⚙️</div>
      <div>选中画布中的组件<br/>在此编辑属性</div>
    </div>

    <div v-else-if="isMultiSelect" class="content content-multi">
      <div class="title">
        <span>{{ t('已选 {n} 个组件', { n: project.selectedIds.length }) }}</span>
        <span class="title-actions">
          <button class="btn btn-sm" @click="project.clearSelection()" :title="t('取消选择 (Esc)')">{{ t('取消选择') }}</button>
          <button
            class="btn btn-sm btn-danger"
            @click="confirmRemoveSelected"
            :title="t('删除选中的所有组件')"
          >🗑 {{ t('删除 ({n})', { n: project.selectedIds.length }) }}</button>
        </span>
      </div>

      <!-- 对齐：6 个方向 -->
      <fieldset>
        <legend>{{ t('对齐') }}</legend>
        <div class="align-grid">
          <button class="btn btn-sm" @click="align('left')" :title="t('左对齐')">⬅</button>
          <button class="btn btn-sm" @click="align('hcenter')" :title="t('水平居中')">↔</button>
          <button class="btn btn-sm" @click="align('right')" :title="t('右对齐')">➡</button>
          <button class="btn btn-sm" @click="align('top')" :title="t('上对齐')">⬆</button>
          <button class="btn btn-sm" @click="align('vcenter')" :title="t('垂直居中')">↕</button>
          <button class="btn btn-sm" @click="align('bottom')" :title="t('下对齐')">⬇</button>
        </div>
      </fieldset>

      <!-- 等距：3+ 才生效 -->
      <fieldset>
        <legend>{{ t('等距') }}</legend>
        <div class="align-grid">
          <button class="btn btn-sm" :disabled="project.selectedIds.length < 3" @click="distribute('h')" :title="t('水平等距（需 ≥3 个）')">⇋ {{ t('水平等距') }}</button>
          <button class="btn btn-sm" :disabled="project.selectedIds.length < 3" @click="distribute('v')" :title="t('垂直等距（需 ≥3 个）')">⇵ {{ t('垂直等距') }}</button>
        </div>
      </fieldset>

      <!-- 层级 / 复制 -->
      <fieldset>
        <legend>{{ t('操作') }}</legend>
        <div class="align-grid">
          <button class="btn btn-sm" @click="project.duplicateSelected()" :title="t('复制选中的所有组件（Ctrl+D）')">⎘ {{ t('复制') }}</button>
          <button class="btn btn-sm" @click="project.bringToFront()" :title="t('置顶选中')">{{ t('置顶') }}</button>
          <button class="btn btn-sm" @click="project.sendToBack()" :title="t('置底选中')">{{ t('置底') }}</button>
        </div>
      </fieldset>

      <div class="multi-tip">
        <span>{{ t('提示：画布/图层点击=单选，Ctrl+点击=加选/取消，Shift+点击=范围选，Ctrl+A=全选') }}</span>
      </div>
    </div>

    <div v-else class="content">
      <div class="title">
        <span>{{ t(typeNames[selected.type] || selected.type) }} {{ t('属性') }}</span>
        <span class="title-actions">
          <button
            class="btn btn-sm"
            @click="copyStyle"
            :title="t('复制当前组件的样式（不含位置/大小/文本/绑定）')"
          >📋 {{ t('复制样式') }}</button>
          <button
            class="btn btn-sm"
            :disabled="!canPasteStyle"
            :title="canPasteStyle ? t('将样式粘贴到当前组件（Ctrl+Shift+V）') : t('剪贴板无匹配样式或类型不同')"
            @click="pasteStyle"
          >📥 {{ t('粘贴样式') }}</button>
          <button
            class="btn btn-sm btn-danger"
            @click="confirmDeleteComponent"
            :title="t('删除整个组件（可撤销 Ctrl+Z）')"
          >🗑 {{ t('删除组件') }}</button>
        </span>
      </div>
      <div v-if="styleClipboard" class="style-clipboard-hint" :title="clipboardHintDetail">
        <span>📋 {{ t('已复制') }} <b>{{ styleClipboard.sourceName }}</b> {{ t('的样式') }}</span>
        <button class="btn btn-sm btn-clear" @click="styleClipboard = null" :title="t('清空剪贴板')">×</button>
      </div>

      <!-- 通用：位置尺寸 -->
      <fieldset>
        <legend>位置 & 尺寸 (mm)</legend>
        <div class="form-row">
          <label>X</label><input class="input" type="number" step="0.1" :value="selected.left" @input="update('left', +$event.target.value)" />
          <label>Y</label><input class="input" type="number" step="0.1" :value="selected.top" @input="update('top', +$event.target.value)" />
        </div>
        <div class="form-row">
          <label>宽</label><input class="input" type="number" step="0.1" :value="selected.width" @input="update('width', +$event.target.value)" />
          <label>高</label><input class="input" type="number" step="0.1" :value="selected.height" @input="update('height', +$event.target.value)" />
        </div>
        <div class="form-row">
          <label>角度</label><input class="input" type="number" step="1" :value="selected.angle || 0" @input="update('angle', +$event.target.value)" />
          <span class="hint">度（-180~180）</span>
        </div>
      </fieldset>

      <!-- 通用：字段失效即时预警（所有组件类型通用） -->
      <div v-if="missingInSelection.length" class="field-alert">
        <div class="field-alert-head">⚠ {{ t('这个组件引用了数据里没有的字段') }}</div>
        <div class="field-alert-list">
          <code v-for="f in missingInSelection" :key="f">{{ f }}</code>
        </div>
        <div class="field-alert-tip">{{ t('打印时会显示为空白。可把它们对应到真实列名，或改数据列名。') }}</div>
        <button class="btn btn-sm" @click="emit('field-map')">{{ t('去字段映射') }}</button>
      </div>

      <!-- 通用：组件名 -->
      <fieldset>
        <legend>组件名（图层）</legend>
        <input class="input" :value="selected.name" @input="update('name', $event.target.value)" placeholder="便于在图层列表识别" />
      </fieldset>

      <!-- 文本 -->
      <fieldset v-if="selected.type === 'text'">
        <legend>文本内容</legend>
        <textarea class="input" rows="3" :value="selected.text" @input="update('text', $event.target.value)" placeholder="支持 {{字段名}} 占位符" />
        <div class="form-row">
          <label>绑定字段</label>
          <select class="input" :value="selected.binding || ''" @change="onBindingChange($event.target.value)">
            <option value="">（不绑定）</option>
            <option v-for="f in fieldsWith(selected.binding)" :key="f" :value="f">{{ fieldOptionLabel(f) }}</option>
          </select>
        </div>
        <div v-if="selected.binding" class="hint">{{ t('当前绑定：{name}', { name: selected.binding }) }}<template v-if="!data.fields.includes(selected.binding)">{{ t('（数据里还没有此列）') }}</template></div>
        <div class="form-row">
          <label>字号</label><input class="input" type="number" :value="selected.fontSize" @input="update('fontSize', +$event.target.value)" />
        </div>
        <div class="form-row">
          <label>字色</label><input class="input" type="color" :value="selected.fill" @input="update('fill', $event.target.value)" />
        </div>
        <div class="form-row">
          <label>字体</label>
          <select class="input" :value="selected.fontFamily" @change="update('fontFamily', $event.target.value)">
            <option value="Microsoft YaHei">微软雅黑</option>
            <option value="SimSun">宋体</option>
            <option value="SimHei">黑体</option>
            <option value="KaiTi">楷体</option>
            <option value="Arial">Arial</option>
            <option value="sans-serif">默认</option>
          </select>
        </div>
        <div class="form-row">
          <label>字重</label>
          <select class="input" :value="selected.fontWeight" @change="update('fontWeight', $event.target.value)">
            <option value="normal">常规</option>
            <option value="bold">粗体</option>
          </select>
        </div>
        <div class="form-row">
          <label>对齐</label>
          <div class="btn-group">
            <button class="btn btn-sm" :class="{active: selected.textAlign==='left'}" @click="update('textAlign','left')">左</button>
            <button class="btn btn-sm" :class="{active: selected.textAlign==='center'}" @click="update('textAlign','center')">中</button>
            <button class="btn btn-sm" :class="{active: selected.textAlign==='right'}" @click="update('textAlign','right')">右</button>
          </div>
        </div>
      </fieldset>

      <!-- 图片 -->
      <fieldset v-if="selected.type === 'image'">
        <legend>图片</legend>
        <div class="form-row">
          <label>来源</label>
          <select class="input" :value="selected.source || 'static'" @change="update('source', $event.target.value)">
            <option value="static">静态图片</option>
            <option value="field">数据字段（路径）</option>
          </select>
        </div>

        <!-- 静态模式：缩略图 + 上传/更换/清除 -->
        <template v-if="(selected.source || 'static') === 'static'">
          <div class="form-row">
            <label>预览</label>
            <div class="img-preview">
              <img v-if="selected.src" :src="selected.src" alt="图片预览" @load="onImgPreviewLoad" @error="onImgPreviewError" />
              <div v-else class="img-empty">未选择图片</div>
            </div>
          </div>
          <div class="form-row">
            <label></label>
            <div class="img-actions">
              <label class="btn btn-sm" :class="{ 'btn-primary': !selected.src }">
                {{ selected.src ? '更换图片' : '选择图片' }}
                <input type="file" accept="image/*" @change="onImageUpload" hidden />
              </label>
              <button v-if="selected.src" class="btn btn-sm" @click="clearImage" title="移除已上传的图片">清除</button>
              <span v-if="imgInfo" class="img-info">{{ imgInfo }}</span>
            </div>
          </div>
        </template>

        <!-- 字段模式：按数据动态加载图片，无静态预览 -->
        <template v-else>
          <div class="form-row">
            <label>字段</label>
            <select class="input" :value="selected.binding" @change="update('binding', $event.target.value)">
              <option value="">选择字段</option>
              <option v-for="f in fieldsWith(selected.binding)" :key="f" :value="f">{{ fieldOptionLabel(f) }}</option>
            </select>
          </div>
          <div class="hint">按行加载：每行将该字段值作为图片 URL 渲染</div>
        </template>
      </fieldset>

      <!-- 二维码 -->
      <fieldset v-if="selected.type === 'qrcode'">
        <legend>二维码</legend>
        <div class="form-row">
          <label>绑定</label>
          <select class="input" :value="selected.binding" @change="update('binding', $event.target.value)">
            <option value="">选择字段</option>
            <option v-for="f in fieldsWith(selected.binding)" :key="f" :value="f">{{ fieldOptionLabel(f) }}</option>
          </select>
        </div>
        <div v-if="selected.binding" class="hint">{{ t('当前绑定：{name}', { name: selected.binding }) }}<template v-if="!data.fields.includes(selected.binding)">{{ t('（数据里还没有此列）') }}</template></div>
        <div v-else class="hint">{{ t('未绑定，使用下方静态文本') }}</div>
        <div class="form-row">
          <label>静态文本</label>
          <input class="input" :value="selected.text" @input="update('text', $event.target.value)" placeholder="无绑定时的内容" />
        </div>
      </fieldset>

      <!-- 条形码 -->
      <fieldset v-if="selected.type === 'barcode'">
        <legend>条形码</legend>
        <div class="form-row">
          <label>绑定</label>
          <select class="input" :value="selected.binding" @change="update('binding', $event.target.value)">
            <option value="">选择字段</option>
            <option v-for="f in fieldsWith(selected.binding)" :key="f" :value="f">{{ fieldOptionLabel(f) }}</option>
          </select>
        </div>
        <div v-if="selected.binding" class="hint">{{ t('当前绑定：{name}', { name: selected.binding }) }}<template v-if="!data.fields.includes(selected.binding)">{{ t('（数据里还没有此列）') }}</template></div>
        <div v-else class="hint">{{ t('未绑定，使用下方静态文本') }}</div>
        <div class="form-row">
          <label>静态文本</label>
          <input class="input" :value="selected.text" @input="update('text', $event.target.value)" />
        </div>
        <div class="form-row">
          <label>格式</label>
          <select class="input" :value="selected.format" @change="update('format', $event.target.value)">
            <option value="CODE128">CODE128</option>
            <option value="EAN13">EAN13</option>
            <option value="CODE39">CODE39</option>
          </select>
        </div>
      </fieldset>

      <!-- 矩形 -->
      <fieldset v-if="selected.type === 'rect'">
        <legend>样式</legend>
        <div class="form-row">
          <label>填充</label><input class="input" type="color" :value="selected.fill" @input="update('fill', $event.target.value)" />
          <label>边框</label><input class="input" type="color" :value="selected.stroke" @input="update('stroke', $event.target.value)" />
        </div>
        <div class="form-row">
          <label>边框宽</label><input class="input" type="number" :value="selected.strokeWidth" @input="update('strokeWidth', +$event.target.value)" />
          <label>圆角</label><input class="input" type="number" :value="selected.rx" @input="update('rx', +$event.target.value)" />
        </div>
      </fieldset>

      <!-- 直线 -->
      <fieldset v-if="selected.type === 'line'">
        <legend>样式</legend>
        <div class="form-row">
          <label>颜色</label><input class="input" type="color" :value="selected.stroke" @input="update('stroke', $event.target.value)" />
          <label>粗细</label><input class="input" type="number" :value="selected.strokeWidth" @input="update('strokeWidth', +$event.target.value)" />
        </div>
      </fieldset>

      <!-- 日期 -->
      <fieldset v-if="selected.type === 'date'">
        <legend>日期时间</legend>
        <div class="form-row">
          <label>来源</label>
          <select class="input" :value="selected.source || 'now'" @change="update('source', $event.target.value)">
            <option value="now">当前时间</option>
            <option value="field">数据字段</option>
          </select>
        </div>
        <div v-if="selected.source === 'field'" class="form-row">
          <label>字段</label>
          <select class="input" :value="selected.binding" @change="update('binding', $event.target.value)">
            <option value="">选择字段</option>
            <option v-for="f in fieldsWith(selected.binding)" :key="f" :value="f">{{ fieldOptionLabel(f) }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>格式</label>
          <input class="input" :value="selected.format || 'YYYY-MM-DD HH:mm:ss'" @input="update('format', $event.target.value)" />
        </div>
      </fieldset>

      <!-- 表格 -->
      <fieldset v-if="selected.type === 'table'">
        <legend>表格</legend>
        <div class="form-row">
          <label>行数</label><input class="input" type="number" min="1" :value="selected.rows" @input="onTableResize('rows', +$event.target.value)" />
          <label>列数</label><input class="input" type="number" min="1" :value="selected.cols" @input="onTableResize('cols', +$event.target.value)" />
        </div>
        <div class="form-row">
          <label>内边距</label><input class="input" type="number" step="0.1" :value="selected.cellPadding" @input="update('cellPadding', +$event.target.value)" />
          <span class="hint">mm</span>
        </div>
        <div class="form-row">
          <label>边框色</label><input class="input" type="color" :value="selected.borderColor" @input="update('borderColor', $event.target.value)" />
          <label>边框</label><input class="input" type="number" step="0.1" :value="selected.borderWidth" @input="update('borderWidth', +$event.target.value)" />
        </div>
        <div class="form-row">
          <label>填充</label><input class="input" type="color" :value="selected.fill || '#ffffff'" @input="update('fill', $event.target.value)" />
          <label>字号</label><input class="input" type="number" :value="selected.fontSize" @input="update('fontSize', +$event.target.value)" />
        </div>
        <div class="form-row">
          <label>对齐</label>
          <div class="btn-group">
            <button class="btn btn-sm" :class="{active: selected.textAlign==='left'}" @click="update('textAlign','left')">左</button>
            <button class="btn btn-sm" :class="{active: selected.textAlign==='center'}" @click="update('textAlign','center')">中</button>
            <button class="btn btn-sm" :class="{active: selected.textAlign==='right'}" @click="update('textAlign','right')">右</button>
          </div>
        </div>
        <div class="form-row">
          <label>垂直</label>
          <div class="btn-group">
            <button class="btn btn-sm" :class="{active: (selected.vAlign || 'middle')==='top'}" @click="update('vAlign','top')" :title="t('顶对齐')">↑</button>
            <button class="btn btn-sm" :class="{active: (selected.vAlign || 'middle')==='middle'}" @click="update('vAlign','middle')" :title="t('垂直居中')">↕</button>
            <button class="btn btn-sm" :class="{active: (selected.vAlign || 'middle')==='bottom'}" @click="update('vAlign','bottom')" :title="t('底对齐')">↓</button>
          </div>
        </div>
        <div class="form-row">
          <label>表头</label>
          <div class="btn-group">
            <button class="btn btn-sm" :class="{active: selected.headerRow !== false}" @click="update('headerRow', true)">加粗突出</button>
            <button class="btn btn-sm" :class="{active: selected.headerRow === false}" @click="update('headerRow', false)">普通</button>
          </div>
        </div>
        <div v-if="selected.headerRow !== false" class="form-row">
          <label>表头底色</label>
          <input class="input" type="color" :value="selected.headerBg || '#f1f5f9'" @input="update('headerBg', $event.target.value)" />
        </div>
        <div class="col-weights">
          <div class="cw-title">
            <span>列宽比例</span>
            <button class="btn btn-sm" @click="equalColWidths">等宽</button>
          </div>
          <div class="cw-items">
            <div v-for="(w, i) in colWeights" :key="i" class="cw-item">
              <span>列{{ i + 1 }}</span>
              <input class="input" type="number" min="5" max="95" step="5"
                :value="w" @input="setColWeight(i, +$event.target.value)" />
              <span class="unit">%</span>
            </div>
          </div>
        </div>
      </fieldset>

      <!-- 表格单元格编辑 -->
      <fieldset v-if="selected.type === 'table'">
        <legend>单元格内容（{{ selected.rows }} 行 × {{ selected.cols }} 列）</legend>
        <div class="hint-row">
          <span class="hint">悬停高亮所在行列；点击「文本/绑定」标签可直接切换。</span>
          <button
            v-if="selected.rows > 1"
            class="btn btn-sm"
            :title="t('把第 1 行的类型和绑定复制到下面所有行')"
            @click="applyFirstRowToAll"
          >⧉ {{ t('首行 → 整列') }}</button>
        </div>
        <div class="cell-scroll">
          <table class="cell-editor">
            <thead>
              <tr>
                <th class="rh rh-corner">行＼列</th>
                <th v-for="col in selected.cols" :key="'c' + col" class="ch">列 {{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in selected.rows"
                :key="'r' + r"
                :class="{ 'row-hover': hoveredRow === r - 1 }"
              >
                <th class="rh">行 {{ r }}</th>
                <td
                  v-for="col in selected.cols"
                  :key="'c' + col"
                  class="cell-box"
                  :class="[...cellClass(r - 1, col - 1), { 'col-hover': hoveredCol === col - 1 }]"
                  @mouseenter="hoveredRow = r - 1; hoveredCol = col - 1"
                  @mouseleave="hoveredRow = null; hoveredCol = null"
                >
                  <!-- 工具行：类型 + 绑定 + 取消（紧凑下拉，跟"列选择"统一风格） -->
                  <div class="cell-toolbar">
                    <select
                      class="cell-type"
                      :class="`type-${getCell(r-1,col-1,'type')||'text'}`"
                      :value="getCell(r - 1, col - 1, 'type') || 'text'"
                      @change="setCell(r - 1, col - 1, 'type', $event.target.value)"
                    >
                      <option v-for="opt in typeTabs" :key="opt.v" :value="opt.v">{{ opt.icon }} {{ t(opt.label) }}</option>
                    </select>
                    <select
                      class="cell-bind"
                      :value="getCell(r - 1, col - 1, 'binding')"
                      @change="setCell(r - 1, col - 1, 'binding', $event.target.value)"
                    >
                      <option value="">＋ {{ t('绑定字段') }}</option>
                      <option v-for="f in fieldsWith(getCell(r - 1, col - 1, 'binding'))" :key="f" :value="f">🔗 {{ fieldOptionLabel(f) }}</option>
                    </select>
                    <button
                      v-if="getCell(r - 1, col - 1, 'binding')"
                      class="bind-x"
                      :title="t('取消绑定')"
                      @click="setCell(r - 1, col - 1, 'binding', '')"
                    >×</button>
                  </div>

                  <!-- 内容输入：按 type 自适应 -->
                  <!-- 文本类型：文本框（支持 {{字段}} 模板） -->
                  <input
                    v-if="(getCell(r-1,col-1,'type')||'text') === 'text'"
                    class="input cell-input"
                    :value="getCell(r - 1, col - 1, 'text')"
                    @input="setCell(r - 1, col - 1, 'text', $event.target.value)"
                    :placeholder="cellPlaceholder(r - 1, col - 1)"
                  />
                  <!-- 条码类型：格式选择 + 静态值（绑字段时自动） -->
                  <select
                    v-if="getCell(r-1,col-1,'type') === 'barcode'"
                    class="input cell-select"
                    :value="getCell(r - 1, col - 1, 'format') || 'CODE128'"
                    @change="setCell(r - 1, col - 1, 'format', $event.target.value)"
                  >
                    <option value="CODE128">CODE128</option>
                    <option value="EAN13">EAN13</option>
                    <option value="CODE39">CODE39</option>
                  </select>
                  <!-- 二维码/条码静态值（仅未绑字段时可手填） -->
                  <input
                    v-if="(getCell(r-1,col-1,'type') === 'qrcode' || getCell(r-1,col-1,'type') === 'barcode') && !getCell(r-1,col-1,'binding')"
                    class="input cell-input"
                    :value="getCell(r - 1, col - 1, 'text')"
                    @input="setCell(r - 1, col - 1, 'text', $event.target.value)"
                    :placeholder="(getCell(r-1,col-1,'type') === 'qrcode' ? '二维码内容' : '条码内容')"
                  />
                  <!-- 图片：上传（仅未绑字段时） -->
                  <input
                    v-if="getCell(r-1,col-1,'type') === 'image' && !getCell(r-1,col-1,'binding')"
                    type="file"
                    accept="image/*"
                    class="cell-file"
                    @change="onCellImage(r - 1, col - 1, $event)"
                  />
                  <!-- 提示 -->
                  <div
                    v-if="(getCell(r-1,col-1,'type')||'text') === 'text' && (getCell(r-1,col-1,'text')||'').indexOf('{{') < 0 && getCell(r-1,col-1,'binding')"
                    class="cell-hint"
                  >{{ t('如：产品：{字段}，前后可加静态字') }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </fieldset>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../utils/i18n'
const { t } = useI18n()
import { useProjectStore } from '../stores/project'
import { useDataStore } from '../stores/data'
import { availableFields, componentFields, componentMissingFields } from '../utils/diagnose'
import { placeholderNames, rewriteBindingText } from '../utils/render'
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const project = useProjectStore()
const data = useDataStore()

const emit = defineEmits(['field-map'])

const selected = computed(() => project.selectedComponent)
const isMultiSelect = computed(() => project.isMultiSelect)

// 选中组件引用了「数据里不存在」的字段 → 即时预警（避免「打出来是空白」的困惑）
const availFieldSet = computed(() => availableFields(data.fields, project.project.dataSource.fieldMap))
const missingInSelection = computed(() =>
  selected.value ? componentMissingFields(selected.value, availFieldSet.value) : []
)

// 多选工具：直接代理 store
function align(direction) { project.alignSelected(direction) }
function distribute(axis) { project.distributeSelected(axis) }
function confirmRemoveSelected() {
  if (!project.selectedIds.length) return
  if (!confirm(t('确定要删除选中的 {n} 个组件？\n此操作可通过 Ctrl+Z 撤销。').replace('{n}', project.selectedIds.length))) return
  project.removeSelected()
}
const typeNames = { text: '文本', image: '图片', table: '表格', qrcode: '二维码', barcode: '条形码', rect: '矩形', line: '直线', date: '日期' }

// 单元格类型 tab：4 选 1（label 用中文原文作 i18n key）
const typeTabs = [
  { v: 'text',    icon: '📝', label: '文本' },
  { v: 'qrcode',  icon: '▣',  label: '二维码' },
  { v: 'barcode', icon: '▌',  label: '条码' },
  { v: 'image',   icon: '🖼', label: '图片' }
]

// 下拉里始终带上当前绑定，即使数据列里还没有这个名字
function fieldsWith(current) {
  const list = data.fields.slice()
  if (current && !list.includes(current)) list.unshift(current)
  return list
}
function fieldOptionLabel(name) {
  if (!name || data.fields.includes(name)) return name
  return t('{name}（数据里还没有）', { name })
}

function update(key, value) {
  if (selected.value) {
    project.updateComponent(selected.value.id, { [key]: value })
  }
}

// 删除组件：加二次确认，避免误点把"删字"理解成"删组件"
function confirmDeleteComponent() {
  const c = selected.value
  if (!c) return
  const name = c.name || typeNames[c.type] || c.type
  if (!confirm(t('确定要删除「{name}」组件？\n此操作可通过 Ctrl+Z 撤销。').replace('{name}', name))) return
  project.removeComponent(c.id)
}

// ============ 复制 / 粘贴样式 ============
// 哪些键算"样式"（不含位置/尺寸/身份/数据绑定）
// 注意：src/text/binding/tableData 等业务数据不在内
const STYLE_KEYS = [
  // 通用
  'fill', 'stroke', 'strokeWidth', 'opacity',
  // 矩形/形状
  'rx', 'ry',
  // 文本
  'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textAlign',
  'lineHeight', 'letterSpacing', 'textDecoration', 'underline',
  // 表格
  'cellBgColor', 'cellTextColor', 'headerBg', 'headerText', 'gridColor', 'gridWidth'
]
// 剪贴板：保存源类型 + 样式键值对 + 来源名（提示用）
// 跨组件类型粘贴：仅贴两类型都有的键（避免 text 的 fontSize 误贴到 image）
const styleClipboard = ref(null)

function copyStyle() {
  const c = selected.value
  if (!c) return
  const style = {}
  for (const k of STYLE_KEYS) if (k in c) style[k] = c[k]
  if (!Object.keys(style).length) {
    alert(t('当前组件没有可复制的样式属性'))
    return
  }
  styleClipboard.value = {
    type: c.type,
    style,
    sourceName: c.name || typeNames[c.type] || c.type
  }
}

const canPasteStyle = computed(() => {
  const c = selected.value
  return !!(c && styleClipboard.value && styleClipboard.value.type === c.type)
})

const clipboardHintDetail = computed(() => {
  if (!styleClipboard.value) return ''
  const keys = Object.keys(styleClipboard.value.style)
  return t('共 {n} 个样式属性：{keys}', { n: keys.length, keys: keys.join(', ') })
})

function pasteStyle() {
  const c = selected.value
  if (!c || !canPasteStyle.value) return
  // 防御：只贴源组件有的键（理论上 STYLE_KEYS 范围内已过滤，但 type 不匹配会被 canPasteStyle 拦）
  project.updateComponent(c.id, { ...styleClipboard.value.style })
}

// 持久化剪贴板：刷新不丢（用户长时间编辑复制样式后页面会意外刷新）
const CLIP_KEY = 'labelprint_style_clipboard_v1'
try {
  const raw = localStorage.getItem(CLIP_KEY)
  if (raw) {
    const saved = JSON.parse(raw)
    if (saved && saved.type && saved.style) styleClipboard.value = saved
  }
} catch (e) { /* localStorage 不可用时忽略 */ }
watch(styleClipboard, (v) => {
  try {
    if (v) localStorage.setItem(CLIP_KEY, JSON.stringify(v))
    else localStorage.removeItem(CLIP_KEY)
  } catch (e) { /* 忽略 */ }
})

// 全局快捷键：Ctrl+Shift+C 复制样式 / Ctrl+Shift+V 粘贴样式
function onGlobalStyleKey(e) {
  const mod = e.ctrlKey || e.metaKey
  if (!mod || !e.shiftKey) return
  // 忽略输入框内
  const tag = (e.target.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return
  const k = e.key.toLowerCase()
  if (k === 'c') { e.preventDefault(); copyStyle() }
  else if (k === 'v') { e.preventDefault(); pasteStyle() }
}
onMounted(() => window.addEventListener('keydown', onGlobalStyleKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalStyleKey))

function dropUnusedFieldMapKeys(removedNames) {
  if (!removedNames.length) return
  const still = new Set()
  for (const c of project.project.components) {
    for (const n of componentFields(c)) still.add(n)
  }
  const fm = { ...(project.project.dataSource.fieldMap || {}) }
  let changed = false
  for (const name of removedNames) {
    if (name && !still.has(name) && name in fm) {
      delete fm[name]
      changed = true
    }
  }
  if (changed) project.updateFieldMap(fm)
}

function onBindingChange(field) {
  const cur = selected.value
  if (!cur) return
  const old = cur.binding || ''
  const text = rewriteBindingText(cur.text || '', old, field || '')
  project.updateComponent(cur.id, { binding: field, text })
  const removed = placeholderNames(cur.text || '').filter(n => !placeholderNames(text).includes(n))
  if (old && old !== field) removed.push(old)
  dropUnusedFieldMapKeys(removed)
}

// 表格调整行/列数
function onTableResize(key, val) {
  if (!selected.value) return
  const c = selected.value
  const oldRows = c.rows || 3
  const oldCols = c.cols || 3
  const newRows = key === 'rows' ? Math.max(1, val) : oldRows
  const newCols = key === 'cols' ? Math.max(1, val) : oldCols

  // 调整 cells 字典：保留交集，新增空
  const newCells = {}
  for (let r = 0; r < newRows; r++) {
    for (let col = 0; col < newCols; col++) {
      const k = `${r},${col}`
      newCells[k] = c.cells?.[k] || { text: (r === 0 ? `列${col + 1}` : ''), binding: '' }
    }
  }
  const patch = { [key]: key === 'rows' ? newRows : newCols, cells: newCells }
  // 列数变化 → 列宽比例回到等宽（数量对不上会退回等宽，这里显式重置更直观）
  if (key === 'cols' || (c.colWidths && c.colWidths.length !== newCols)) {
    patch.colWidths = Array(newCols).fill(Math.round(100 / newCols * 100) / 100)
  }
  project.updateComponent(c.id, patch)
}

// ============ 表格列宽比例（百分比，总和 100） ============
function currentWeights() {
  const c = selected.value
  const cols = Math.max(1, c?.cols || 1)
  const raw = (Array.isArray(c?.colWidths) && c.colWidths.length === cols)
    ? c.colWidths.map(Number)
    : Array(cols).fill(1)
  const sum = raw.reduce((a, b) => a + (b > 0 ? b : 0), 0) || cols
  return raw.map(x => (x > 0 ? x : 0) / sum * 100)
}

const colWeights = computed(() => {
  if (!selected.value || selected.value.type !== 'table') return []
  return currentWeights().map(v => Math.round(v * 10) / 10)
})

// 改某一列宽度，其余列按当前比例分摊剩余空间
function setColWeight(i, val) {
  const c = selected.value
  if (!c) return
  const cols = Math.max(1, c.cols || 1)
  const cur = currentWeights()
  const v = Math.min(95, Math.max(5, Number(val) || 5))
  const othersOld = cur.reduce((a, b, idx) => (idx === i ? a : a + b), 0)
  const rest = 100 - v
  const next = cur.map((x, idx) => {
    if (idx === i) return v
    if (othersOld <= 0) return rest / Math.max(1, cols - 1)
    return x / othersOld * rest
  })
  project.updateComponent(c.id, { colWidths: next.map(x => Math.round(x * 100) / 100) })
}

function equalColWidths() {
  const c = selected.value
  if (!c) return
  const cols = Math.max(1, c.cols || 1)
  project.updateComponent(c.id, { colWidths: Array(cols).fill(Math.round(100 / cols * 100) / 100) })
}

function getCell(r, c, key) {
  return selected.value?.cells?.[`${r},${c}`]?.[key] ?? ''
}

// 把第 1 行的 type/binding/text 模板复制到所有行（同列），
// 表格类标签几乎都是"表头行 + 数据行绑同名字段"，免去逐格重复设置
function applyFirstRowToAll() {
  const c = selected.value
  if (!c || c.type !== 'table') return
  const rows = Math.max(1, c.rows || 1)
  const cols = Math.max(1, c.cols || 1)
  const cells = JSON.parse(JSON.stringify(c.cells || {}))
  for (let col = 0; col < cols; col++) {
    const src = cells[`0,${col}`]
    if (!src) continue
    for (let r = 1; r < rows; r++) {
      const k = `${r},${col}`
      cells[k] = {
        ...JSON.parse(JSON.stringify(src)),
        // 绑定字段时文本用 {{字段}} 占位（与 setCell 行为一致）
        text: src.binding ? `{{${src.binding}}}` : (src.text || '')
      }
    }
  }
  project.updateComponent(c.id, { cells })
}

// 鼠标悬停坐标（用于高亮行号/列号）
const hoveredRow = ref(null)
const hoveredCol = ref(null)

// 单元格视觉类：类型配色 + 绑定/空状态
function cellClass(r, c) {
  const t = getCell(r, c, 'type') || 'text'
  const b = getCell(r, c, 'binding')
  const text = getCell(r, c, 'text')
  return [
    `type-${t}`,
    { 'is-bound': !!b, 'is-empty': !b && !text }
  ]
}

function cellPlaceholder(r, c) {
  const type = getCell(r, c, 'type') || 'text'
  if (type === 'qrcode') return '二维码内容'
  if (type === 'barcode') return '条码内容，如 6901234567892'
  if (type === 'image') return '图片 URL（或绑定字段）'
  return '文本，支持 {{字段}}'
}

// 单元格内嵌入本地图片 → dataURL
function onCellImage(r, c, e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
    setCell(r, c, 'src', ev.target.result)
    setCell(r, c, 'text', ev.target.result)
  }
  reader.readAsDataURL(file)
}

function setCell(r, c, key, value) {
  if (!selected.value) return
  const cells = JSON.parse(JSON.stringify(selected.value.cells || {}))
  const k = `${r},${c}`
  if (!cells[k]) cells[k] = { text: '', binding: '' }
  const oldBinding = cells[k].binding || ''
  cells[k][key] = value
  const ctype = cells[k].type || 'text'
  // 换绑时改写占位符，前后缀保留：{{名称}}111 → {{ID号}}111
  if (ctype === 'text' && key === 'binding') {
    cells[k].text = rewriteBindingText(cells[k].text || '', oldBinding, value || '')
  }
  // 切换为二维码/条码时，若内容是纯文本占位符则清空，避免把 {{字段}} 编成码
  // 用户已写 "前缀{{字段}}后缀" 时不动
  if (key === 'type' && (value === 'qrcode' || value === 'barcode')) {
    if (/^\{\{.*\}\}$/.test(cells[k].text || '')) cells[k].text = ''
  }
  // 二维码/条码/图片类型：绑字段时也清掉 text（这些类型的内容来自字段，不需手填）
  if ((ctype === 'qrcode' || ctype === 'barcode' || ctype === 'image') && key === 'binding' && value) {
    if (/^\{\{.*\}\}$/.test(cells[k].text || '')) cells[k].text = ''
  }
  project.updateComponent(selected.value.id, { cells })
}

function onImageUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
    update('src', ev.target.result)
    // 记录原始尺寸，便于提示
    const img = new Image()
    img.onload = () => { imgInfo.value = `${img.naturalWidth}×${img.naturalHeight} · ${Math.round(file.size / 1024)}KB` }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
  // 允许重复选择同一文件
  e.target.value = ''
}

const imgInfo = ref('')  // 已上传图片的尺寸+大小

function clearImage() {
  update('src', '')
  imgInfo.value = ''
}

function onImgPreviewLoad(e) {
  const img = e.target
  if (img.naturalWidth) imgInfo.value = `${img.naturalWidth}×${img.naturalHeight}`
}
function onImgPreviewError() {
  imgInfo.value = '图片加载失败'
}
</script>

<style scoped>
.property-panel {
  padding: 12px;
  height: 100%;
  overflow: auto;
}
/* 覆盖全局 label 80px 最小宽度：属性面板空间有限，用紧凑布局 */
.form-row {
  gap: 6px;
}
.form-row label {
  min-width: 0;
  width: auto;
  flex-shrink: 0;
  font-size: 12px;
  white-space: nowrap;
}
.form-row .input {
  flex: 1;
  min-width: 0;
  max-width: 260px;
  padding: 4px 6px;
  font-size: 12px;
}
.form-row input[type="color"] {
  flex: 0 0 40px;
  padding: 2px;
  height: 28px;
}
.empty {
  text-align: center;
  color: var(--text-muted);
  padding: 60px 20px;
  font-size: 12px;
}
.title {
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.title-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.style-clipboard-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-soft, rgba(99,102,241,0.08));
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 4px 8px;
  margin-bottom: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}
.style-clipboard-hint b { color: var(--primary); }
.btn-clear {
  width: 20px; height: 20px; padding: 0;
  border: 0; background: transparent;
  color: var(--text-muted);
  cursor: pointer; border-radius: 3px;
  font-size: 14px; line-height: 1;
}
.btn-clear:hover { background: var(--bg-hover); color: var(--danger); }

/* ============ 多选模式：排版工具栏 ============ */
.content-multi .title { color: var(--primary); }
.align-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}
.align-grid .btn {
  padding: 6px 0;
  font-size: 14px;
  justify-content: center;
}
.align-grid .btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.multi-tip {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
  padding: 8px;
  background: var(--bg);
  border-radius: 4px;
  margin-top: 8px;
}
.btn-danger {
  background: var(--danger);
  color: white;
  border-color: var(--danger);
}
fieldset {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  margin-bottom: 12px;
  /* fieldset 默认 min-inline-size:min-content，会被宽表格撑破面板 */
  min-width: 0;
}
legend {
  padding: 0 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
  margin: 4px 0;
}
.btn-group {
  display: flex;
  gap: 2px;
}
.btn-group .btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
/* 列宽比例编辑 */
.col-weights {
  margin-bottom: 8px;
}
.cw-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.cw-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cw-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--text-secondary);
}
.cw-item .input {
  width: 52px;
  padding: 3px 4px;
  font-size: 11px;
}
.cw-item .unit { color: var(--text-muted); }

/* 列数多时横向滚动，不压缩单元格 */
.cell-scroll {
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 2px;
}
.cell-editor {
  width: max-content;   /* 让 min-width 生效，配合外层横向滚动 */
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
  margin-top: 4px;
}
/* 横向滚动容器：列多时表格可滚动，不被挤压 */
.cell-scroll { overflow-x: auto; }
/* 顶部提示 + 首行按钮：窄面板换行不截断 */
.hint-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.hint-row .hint { flex: 1; min-width: 0; }
.cell-editor th, .cell-editor td {
  border: 1px solid var(--border);
  padding: 0;
  vertical-align: top;
  background: var(--bg-panel);
}
/* 行列号 */
.cell-editor .rh {
  background: var(--bg);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 10px;
  padding: 4px 4px;
  text-align: center;
  width: 36px;
  min-width: 36px;
  position: sticky;
  left: 0;
  z-index: 1;
  border-right: 1px solid var(--border);
}
.cell-editor .rh-corner {
  background: var(--bg-toolbar);
  z-index: 2;
}
.cell-editor thead .ch {
  background: var(--bg);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 10px;
  padding: 4px;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 1;
}
.cell-editor thead .ch { z-index: 1; }
.cell-editor thead .rh-corner { z-index: 2; }
.cell-editor tbody .rh { z-index: 1; }
/* 悬停高亮：整行变蓝背景 + 行号也变蓝；hovered 列在格子顶部加粗下划线 */
.cell-editor tbody tr.row-hover { background: var(--row-active-bg, #dbeafe); }
.cell-editor tbody tr.row-hover .rh {
  background: var(--row-active-bg, #dbeafe);
  color: var(--row-active-text, #1e3a8a);
}
.cell-box { min-width: 132px; padding: 4px; position: relative; }
.cell-box.col-hover::before {
  content: '';
  position: absolute;
  top: -1px; left: -1px; right: -1px;
  height: 2px;
  background: var(--primary);
}
/* 工具行：类型 + 绑定 + 取消（一行紧凑下拉，节省纵向空间） */
.cell-toolbar {
  display: flex;
  gap: 2px;
  align-items: stretch;
  margin-bottom: 3px;
}
.cell-type {
  flex: 0 0 auto;
  appearance: none; -webkit-appearance: none;
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 4px 1px 4px;
  font-size: 10px;
  line-height: 1.5;
  cursor: pointer;
  background: var(--bg-panel);
  color: var(--text-muted);
  white-space: nowrap;
  font-weight: 600;
}
/* 选中项按类型染字色（与 type-tabs 风格一致） */
.cell-type.type-text    { color: #64748b; }
.cell-type.type-qrcode  { color: #7c3aed; }
.cell-type.type-barcode { color: #2563eb; }
.cell-type.type-image   { color: #16a34a; }
[data-theme='dark'] .cell-type.type-text    { color: #94a3b8; }
[data-theme='dark'] .cell-type.type-qrcode  { color: #c4b5fd; }
[data-theme='dark'] .cell-type.type-barcode { color: #93c5fd; }
[data-theme='dark'] .cell-type.type-image   { color: #86efac; }
/* 类型配色：选中时该类型对应的主色 */
.type-tabs.type-text button.active { background: #64748b; }
.type-tabs.type-qrcode button.active { background: #7c3aed; }
.type-tabs.type-barcode button.active { background: #2563eb; }
.type-tabs.type-image button.active { background: #16a34a; }
[data-theme='dark'] .type-tabs.type-text button.active { background: #475569; }
[data-theme='dark'] .type-tabs.type-qrcode button.active { background: #8b5cf6; }
[data-theme='dark'] .type-tabs.type-barcode button.active { background: #3b82f6; }
[data-theme='dark'] .type-tabs.type-image button.active { background: #22c55e; }

/* 绑定行：下拉 + × 取消按钮 */
.bind-row { display: flex; gap: 2px; align-items: stretch; margin-bottom: 3px; }  /* 兼容旧选择器 */
.cell-bind {
  appearance: none; -webkit-appearance: none;
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 10px;
  line-height: 1.5;
  cursor: pointer;
  background: var(--bg-panel);
  color: var(--text-secondary);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  flex: 1; min-width: 0;
}
.cell-bind:hover { background: var(--bg-hover); }
.bind-x {
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  border-radius: 3px;
  flex-shrink: 0;
}
.bind-x:hover { background: var(--danger); color: #fff; border-color: var(--danger); }
/* 绑定状态：已绑定=蓝色药丸（醒目，一眼看出哪些格已接入数据）；未绑定=淡字 */
.cell-box.is-bound .cell-bind {
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  border-color: transparent;
}
.cell-box:not(.is-bound) .cell-bind { color: var(--text-muted); }
.cell-box.is-empty {
  background: repeating-conic-gradient(var(--bg) 0 90deg, var(--bg-panel) 0 180deg) 0 0 / 8px 8px;
}
.cell-box .cell-input { font-size: 11px; padding: 2px 4px; width: 100%; }
.cell-box .cell-select { font-size: 10px; padding: 1px 4px; margin-top: 2px; width: 100%; }
.cell-box .cell-file { font-size: 10px; width: 100%; margin-top: 2px; }
.cell-hint {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.3;
}
/* 工具行：hint + 操作按钮 */
.hint-row { display: flex; align-items: center; gap: 6px; }
.hint-row .hint { flex: 1; }

/* 图片预览：固定区域，未上传时显示占位 */
.img-preview {
  flex: 1;
  min-width: 0;
  max-width: 200px;
  height: 110px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background:
    repeating-conic-gradient(var(--bg) 0 90deg, var(--bg-panel) 0 180deg) 0 0 / 14px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.img-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}
.img-empty {
  color: var(--text-muted);
  font-size: 12px;
}
.img-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.img-info {
  font-size: 11px;
  color: var(--text-secondary);
}
.cell-file {
  width: 100%;
  font-size: 10px;
  margin-top: 2px;
}
.cell-editor th {
  background: var(--bg);
  font-weight: 600;
  text-align: center;
}
.cell-input, .cell-select {
  font-size: 11px !important;
  padding: 2px 4px !important;
  width: 100%;
  margin-bottom: 2px;
}

/* 字段失效预警 */
.field-alert {
  border: 1px solid #f59e0b;
  background: rgba(245, 158, 11, 0.08);
  border-radius: 6px;
  padding: 8px 10px;
  margin: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
}
.field-alert-head {
  font-weight: 600;
  color: #b45309;
  margin-bottom: 4px;
}
.field-alert-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}
.field-alert-list code {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 11px;
}
.field-alert-tip {
  color: var(--text-secondary);
  font-size: 11px;
  margin-bottom: 6px;
}
</style>
