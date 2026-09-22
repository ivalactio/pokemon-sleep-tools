import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    environmentMatchGlobs: [
      // Tests que importan módulos backend (Node.js) corren en entorno node
      ['src/services/vision/geminiExtractor.test.ts', 'node'],
    ],
  }
})

