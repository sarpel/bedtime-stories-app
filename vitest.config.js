import { defineConfig } from 'vitest/config'

// Vitest sadece frontend testlerini çalıştırsın; backend Jest testlerini hariç tut
export default defineConfig({
  test: {
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    exclude: [
      'backend/**',
      'node_modules/**',
      'dist/**',
      '**/coverage/**',
    ],
    passWithNoTests: true,
    environment: 'jsdom'
  }
})
