import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
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
