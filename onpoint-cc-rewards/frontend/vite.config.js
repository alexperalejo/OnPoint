import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Copies src/assets/cards/ into extension/assets/cards/ after each build so that
// chrome.runtime.getURL('assets/cards/<name>.png') resolves inside the extension package.
function copyCardImages() {
  return {
    name: 'copy-card-images',
    closeBundle() {
      const src = resolve(__dirname, 'src/assets/cards')
      const dest = resolve(__dirname, '../../extension/assets/cards')
      try {
        mkdirSync(dest, { recursive: true })
        for (const file of readdirSync(src)) {
          copyFileSync(resolve(src, file), resolve(dest, file))
        }
        console.log('[copy-card-images] card images → extension/assets/cards/')
      } catch (e) {
        console.warn('[copy-card-images] failed to copy card images:', e.message)
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyCardImages()],
  root: '.',
  base: './',
  build: {
    outDir: '../../extension/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, 'dashboard.html'),
        onboarding: resolve(__dirname, 'onboarding.html')
      }
    }
  }
})
