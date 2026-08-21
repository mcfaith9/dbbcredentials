import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isWebOnly = process.env.VITE_WEB_ONLY === 'true' || mode === 'web'

  return {
    plugins: [
      vue(),
      tailwindcss(),
      ...(!isWebOnly
        ? [
            electron([
              {
                // Main process entry
                entry: 'electron/main.ts',
                onstart(options) {
                  // In local desktop dev, start Electron window
                  // Skip startup in headless web preview container unless explicitly requested
                  if (process.env.NODE_ENV !== 'production') {
                    if (process.platform === 'win32' || process.platform === 'darwin' || process.env.DISPLAY) {
                      options.startup()
                    }
                  }
                },
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    minify: false,
                  },
                },
              },
              {
                // Preload process entry
                entry: 'electron/preload.ts',
                onstart(options) {
                  options.reload()
                },
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    minify: false,
                    rollupOptions: {
                      output: {
                        format: 'es',
                      },
                    },
                  },
                },
              },
            ]),
            renderer(),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  }
})


