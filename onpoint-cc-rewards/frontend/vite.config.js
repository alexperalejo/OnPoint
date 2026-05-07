import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'fs'

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

// Sources synthetic CSV from /docs and exposes it as /synthetic_savings_jan_to_apr_2026.csv in dev/build outputs.
function useDocsSyntheticCsv() {
  const csvName = 'synthetic_savings_jan_to_apr_2026.csv'
  const docsCsv = resolve(__dirname, '../../docs', csvName)

  return {
    name: 'use-docs-synthetic-csv',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?', 1)[0] !== `/${csvName}`) {
          next()
          return
        }

        try {
          const content = readFileSync(docsCsv)
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/csv; charset=utf-8')
          res.end(content)
        } catch (e) {
          res.statusCode = 500
          res.end('Failed to read synthetic CSV from docs')
          console.warn('[use-docs-synthetic-csv] failed serving CSV:', e.message)
        }
      })
    },
    closeBundle() {
      const distCsv = resolve(__dirname, '../../extension/dist', csvName)
      try {
        copyFileSync(docsCsv, distCsv)
        console.log('[use-docs-synthetic-csv] docs CSV → extension/dist/')
      } catch (e) {
        console.warn('[use-docs-synthetic-csv] failed to copy CSV:', e.message)
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyCardImages(), useDocsSyntheticCsv()],
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
