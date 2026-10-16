/**
 * 语言探测：无本地偏好时按浏览器/系统语言选 zh 或 en
 */
import { detectPreferredLang } from '../src/utils/i18n.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(detectPreferredLang(['zh-CN']) === 'zh', 'zh-CN → zh')
assert(detectPreferredLang(['zh-TW']) === 'zh', 'zh-TW → zh')
assert(detectPreferredLang(['zh']) === 'zh', 'zh → zh')
assert(detectPreferredLang(['en-US']) === 'en', 'en-US → en')
assert(detectPreferredLang(['en']) === 'en', 'en → en')
assert(detectPreferredLang(['ja-JP']) === 'en', '日语等非中文 → en')
assert(detectPreferredLang(['zh-CN', 'en-US']) === 'zh', '首选中文')
assert(detectPreferredLang(['en-US', 'zh-CN']) === 'en', '首选英文（忽略后面的中文）')
assert(detectPreferredLang([]) === 'zh', '空列表兜底中文')
assert(detectPreferredLang([null, '']) === 'zh', '无效项兜底中文')

console.log('i18nDetect.test.mjs: 10 passed')
