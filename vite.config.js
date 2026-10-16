import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    // 本机 Node 把 localhost 只绑到 ::1，而连 ::1 会被系统拒绝（EACCES）。
    // 浏览器再去连 127.0.0.1 就会得到 ERR_CONNECTION_REFUSED。
    host: '127.0.0.1',
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    // fabric / xlsx / jspdf 都偏大；分 chunk 后首屏可并行加载、缓存更稳
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('fabric')) return 'vendor-fabric'
          if (id.includes('xlsx')) return 'vendor-xlsx'
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf'
          if (id.includes('qrcode') || id.includes('jsbarcode')) return 'vendor-codes'
          if (id.includes('vue') || id.includes('pinia')) return 'vendor-vue'
        }
      }
    }
  }
})
