import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      reporter: ['html'],
    },
    api: {
      port: 3000,
    },
    environment: 'jsdom',
  },
})
