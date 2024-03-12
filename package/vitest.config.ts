import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      reporter: ['html'],
      exclude: ['**/node_modules/**', 'src/cli.ts'],
    },
    api: {
      port: 3000,
    },
  },
})
