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
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['all'],
      hmr: {
        overlay: false
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          ws: false,
          secure: false
        },
        '/audio': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          ws: false,
          secure: false
        }
      }
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true
    },
    build: {
      target: isProd ? 'es2020' : 'esnext',
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            // Core vendor chunks
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'],
            'vendor-radix': [
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-dialog',
              '@radix-ui/react-label',
              '@radix-ui/react-progress',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slider',
              '@radix-ui/react-slot',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toggle',
              '@radix-ui/react-toggle-group',
              '@radix-ui/react-tooltip'
            ],

            // Application chunks
            'app-services': [
              './src/services/analyticsService',
              './src/services/configService',
              './src/services/llmService',
              './src/services/ttsService',
              './src/services/optimizedDatabaseService',
              './src/services/queueService',
              './src/services/sharingService',
              './src/services/titleService'
            ],
            'app-audio': [
              './src/hooks/useAudioPlayer',
              './src/hooks/useAudioPreloader'
            ],
            'app-utils': [
              './src/utils/cache',
              './src/utils/storyTypes',
              './src/utils/voiceOptions',
              './src/utils/logger',
              './src/utils/safeLocalStorage',
              './src/utils/share'
            ],
            'app-monitoring': [
              './src/utils/stabilityMonitor',
              './src/components/PerformanceMonitor'
            ]
          },
          // Optimize chunk naming for production
          chunkFileNames: isProd ? 'assets/[name].[hash].js' : '[name].js',
          entryFileNames: isProd ? 'assets/[name].[hash].js' : '[name].js',
          assetFileNames: isProd ? 'assets/[name].[hash].[ext]' : '[name].[ext]'
        },
        // External dependencies (if using CDN)
        // Keep empty to bundle everything by default
        external: [],

        // Tree shaking configuration
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false
        }
      },

      // Optimize chunk sizes for better loading
      chunkSizeWarningLimit: isProd ? 500 : 600,

      // Source maps only in development
      sourcemap: isDev,

      // Production minification
      minify: isProd ? 'terser' : false,

      // Terser options optimized for production
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
          passes: 3,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_methods: true,
          unsafe_proto: true,
          unsafe_regexp: true,
          hoist_funs: true,
          hoist_props: true,
          hoist_vars: true
        },
        mangle: {
          safari10: true,
          keep_fnames: false,
          properties: false
        },
        format: {
          comments: false,
          ascii_only: true,
          ecma: 2020
        }
      } : undefined,

      // CSS optimization
      cssCodeSplit: true,
      cssMinify: isProd,

      // Asset optimization
      assetsInlineLimit: isProd ? 1024 : 4096, // Smaller inline limit for production

      // Report options
      reportCompressedSize: !isProd, // Skip in production for faster builds

      // Manifest for cache busting
      manifest: isProd,

      // Write bundle info
      write: true,

      // Empty output directory before build
      emptyOutDir: true
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'lucide-react',
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-dialog',
        '@radix-ui/react-label',
        '@radix-ui/react-progress',
        '@radix-ui/react-radio-group',
        '@radix-ui/react-select',
        '@radix-ui/react-separator',
        '@radix-ui/react-slider',
        '@radix-ui/react-slot',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group',
        '@radix-ui/react-tooltip',
        'clsx',
        'tailwind-merge'
      ],
      force: isDev, // Force re-optimize in development
      esbuildOptions: {
        target: 'es2020'
      }
    },

    // Environment variables and defines
    define: {
      __DEV__: JSON.stringify(isDev),
      __PROD__: JSON.stringify(isProd),
      'process.env.NODE_ENV': JSON.stringify(mode)
    },

    // Experimental features
    experimental: {
      renderBuiltUrl(filename) {
        // Custom URL handling for assets if needed
        return filename
      }
    },

    // CSS configuration
    css: {
      devSourcemap: isDev,
      preprocessorOptions: {
        // Add any CSS preprocessor options here
      }
    },

    // Worker configuration
    worker: {
      format: 'es',
      plugins: () => []
    },

    // Performance configuration
    logLevel: isProd ? 'warn' : 'info',
    clearScreen: false,

    // Environment-specific configurations
    ...(isProd && {
      // Production-only settings
      base: '/', // Adjust if deploying to subdirectory
      publicDir: 'public'
    })
  }
})
