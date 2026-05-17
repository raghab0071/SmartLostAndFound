import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    proxy: {
      '/emergent-api': {
        target: 'https://demobackend.emergentagent.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/emergent-api/, ''),
        secure: false,
      }
    }
  },
})
