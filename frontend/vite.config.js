import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    define: {
      'process.env.REACT_APP_BACKEND_URL': JSON.stringify(env.REACT_APP_BACKEND_URL || ''),
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      hmr: {
        clientPort: 443,
        protocol: 'wss',
      },
      allowedHosts: true,
    },
  }
})
