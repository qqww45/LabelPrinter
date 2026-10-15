import { saveAs } from 'file-saver'

/**
 * 保存 JSON 到本地文件
 */
export function saveJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8'
  })
  saveAs(blob, filename)
}

/**
 * 读取本地 JSON 文件
 */
export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        resolve(JSON.parse(e.target.result))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

/**
 * 通过 input[type=file] 触发文件选择
 */
export function pickFile(accept = '*/*') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'
    document.body.appendChild(input)
    input.onchange = () => {
      document.body.removeChild(input)
      if (input.files && input.files[0]) {
        resolve(input.files[0])
      } else {
        reject(new Error('未选择文件'))
      }
    }
    input.click()
  })
}
