import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  const isProd = mode === 'production'
  
  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['all'],
      hmr: {
        overlay: false // HMR overlay'ını devre dışı bırak
      }
    },
    build: {
      // Performance optimizations
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            vendor: ['react', 'react-dom'],
            ui: ['lucide-react', 'clsx', 'tailwind-merge'],
            analytics: ['@/services/analyticsService'],
            audio: ['@/hooks/useAudioPlayer', '@/hooks/useAudioPreloader'],
            utils: ['@/utils/cache', '@/utils/storyTypes', '@/utils/voiceOptions']
          }
        }
      },
      // Optimize chunk sizes
      chunkSizeWarningLimit: 1000,
      // Enable source maps only in development
      sourcemap: isDev,
      // Minimize in production
      minify: isProd ? 'terser' : false,
      // Terser options for better compression
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info']
        },
        mangle: {
          safari10: true
        },
        format: {
          comments: false
        }
      },
      // CSS optimization
      cssCodeSplit: true,
      // Asset optimization
      assetsInlineLimit: 4096
    },
    optimizeDeps: {
      // Pre-bundle these dependencies
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'lucide-react'
      ],
      // Force optimize these packages
      force: true
    },
    // Performance hints
    define: {
      __DEV__: JSON.stringify(isDev)
    }
  }
})
