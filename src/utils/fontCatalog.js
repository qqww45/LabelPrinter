/**
 * 文本组件可选字体目录。
 * 这里只列 CSS/Fabric 可直接使用的字体名；是否安装取决于用户设备。
 * PropertyPanel 的下拉框和 AI 归一化共用同一份清单，避免 AI 改出选不到的字体。
 */
export const FONT_GROUPS = [
  {
    name: '中文字体',
    items: [
      { value: 'Microsoft YaHei', label: '微软雅黑' },
      { value: 'SimSun', label: '宋体' },
      { value: 'SimHei', label: '黑体' },
      { value: 'KaiTi', label: '楷体' },
      { value: 'FangSong', label: '仿宋' },
      { value: 'DengXian', label: '等线' }
    ]
  },
  {
    name: '英文无衬线',
    items: [
      { value: 'Arial', label: 'Arial' },
      { value: 'Verdana', label: 'Verdana' },
      { value: 'Tahoma', label: 'Tahoma' },
      { value: 'Trebuchet MS', label: 'Trebuchet MS' },
      { value: 'Calibri', label: 'Calibri' },
      { value: 'Century Gothic', label: 'Century Gothic' },
      { value: 'Impact', label: 'Impact' },
      { value: 'Arial Black', label: 'Arial Black' },
      { value: 'Consolas', label: 'Consolas' }
    ]
  },
  {
    name: '英文衬线',
    items: [
      { value: 'Times New Roman', label: 'Times New Roman' },
      { value: 'Georgia', label: 'Georgia' },
      { value: 'Cambria', label: 'Cambria' }
    ]
  },
  {
    name: '手写 / 趣味',
    items: [
      { value: 'Segoe Print', label: 'Segoe Print（手写）' },
      { value: 'Ink Free', label: 'Ink Free（手写）' },
      { value: 'Bradley Hand ITC', label: 'Bradley Hand（手写）' },
      { value: 'Comic Sans MS', label: 'Comic Sans MS（趣味）' },
      { value: 'Lucida Handwriting', label: 'Lucida Handwriting（花体）' }
    ]
  },
  {
    name: '默认',
    items: [
      { value: 'sans-serif', label: '系统默认' }
    ]
  }
]

export const FONT_VALUES = FONT_GROUPS.flatMap(g => g.items.map(item => item.value))
export const FONT_SET = new Set(FONT_VALUES)
