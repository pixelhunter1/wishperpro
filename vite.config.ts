import path from "path"

import tailwindcss from "@tailwindcss/vite"

import react from "@vitejs/plugin-react"

import { defineConfig } from "vite"
import electron from "vite-plugin-electron"
import renderer from "vite-plugin-electron-renderer"

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        overlay: path.resolve(__dirname, 'overlay.html'),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'better-sqlite3', 'openai'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
              fileName: () => 'preload.js',
            },
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                exports: 'auto',
                entryFileNames: 'preload.js',
              },
            },
          },
        },
      },
      {
        entry: 'electron/overlay-preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/overlay-preload.ts',
              formats: ['cjs'],
              fileName: () => 'overlay-preload.js',
            },
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                exports: 'auto',
                entryFileNames: 'overlay-preload.js',
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
