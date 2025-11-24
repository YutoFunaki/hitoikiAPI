import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: 'VITE_',
  build: {
    // TypeScriptエラーがあってもビルドを続行
    rollupOptions: {
      onwarn: (warning, warn) => {
        // TypeScript関連の警告を無視
        if (warning.code === 'TYPESCRIPT_WARNING') {
          return;
        }
        warn(warning);
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

})
