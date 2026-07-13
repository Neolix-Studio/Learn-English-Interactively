import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    proxy: {
      '/api.php': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/tts.php': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/upload_avatar.php': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/logout.php': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
