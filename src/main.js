import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

// 首屏加载屏：等一帧绘制后再淡出，避免闪切（见 index.html #boot-splash）
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('boot-splash')
    if (!splash) return
    splash.classList.add('is-hide')
    const remove = () => splash.remove()
    splash.addEventListener('transitionend', remove, { once: true })
    setTimeout(remove, 520)
  })
})
