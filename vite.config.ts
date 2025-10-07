import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const isProd = mode === "production";
  const gv = globalThis as any;
  const backendPort = parseInt(
    gv?.process?.env?.BACKEND_PORT || gv?.process?.env?.PORT || "3001"
  );
  const backendHost = gv?.process?.env?.BACKEND_HOST || "localhost";
  const backendTarget =
    gv?.process?.env?.VITE_BACKEND_URL ||
    `http://${backendHost}:${backendPort}`;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      // Allow specific external domains for development network access.
      // Uses env var VITE_ALLOWED_HOSTS (comma separated) to extend list.
      // Added arven.sarpel.net per request.
      // Allow all hosts (user request)
      allowedHosts: true,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
          ws: false,
          secure: false,
        },
        "/audio": {
          target: backendTarget,
          changeOrigin: true,
          ws: false,
          secure: false,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
      strictPort: true,
    },
    build: {
      target: isProd ? "es2020" : "esnext",
      outDir: "dist",
      assetsDir: "assets",
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Core vendor chunks
            if (id.includes("node_modules")) {
              // React ecosystem
              if (
                id.includes("react") ||
                id.includes("react-dom") ||
                id.includes("react-router")
              ) {
                return "vendor-react";
              }

              // Radix UI components
              if (id.includes("@radix-ui")) {
                return "vendor-radix";
              }

              // UI utilities
              if (
                id.includes("lucide-react") ||
                id.includes("clsx") ||
                id.includes("tailwind-merge") ||
                id.includes("class-variance-authority")
              ) {
                return "vendor-ui";
              }

              // DnD Kit
              if (id.includes("@dnd-kit")) {
                return "vendor-dnd";
              }

              // Remaining node_modules
              return "vendor-misc";
            }

            // Application chunks - only split large modules
            if (id.includes("/src/components/")) {
              // Heavy components get their own chunks
              if (id.includes("AnalyticsDashboard")) return "app-analytics";
              if (id.includes("StoryCreator")) return "app-creator";
              if (id.includes("StoryManagement")) return "app-management";
              if (id.includes("FavoritesPanel")) return "app-favorites";
              if (id.includes("SearchPanel")) return "app-search";
              if (id.includes("StoryQueuePanel")) return "app-queue";
              if (id.includes("Settings")) return "app-settings";

              // UI components stay in main chunk or group together
              if (id.includes("/ui/")) return "app-ui-components";
            }

            // Services
            if (id.includes("/src/services/")) {
              return "app-services";
            }

            // Hooks
            if (id.includes("/src/hooks/")) {
              return "app-hooks";
            }

            // Utils
            if (id.includes("/src/utils/")) {
              return "app-utils";
            }

            // Everything else stays in main chunk
          },
          // Optimize chunk naming for production
          chunkFileNames: isProd ? "assets/[name].[hash].js" : "[name].js",
          entryFileNames: isProd ? "assets/[name].[hash].js" : "[name].js",
          assetFileNames: isProd
            ? "assets/[name].[hash].[ext]"
            : "[name].[ext]",
        },
        // External dependencies (if using CDN)
        // Keep empty to bundle everything by default
        external: [],

        // Tree shaking configuration
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },

      // Optimize chunk sizes for better loading
      chunkSizeWarningLimit: isProd ? 800 : 1000, // Increased from 500/600

      // Source maps only in development
      sourcemap: isDev,

      // Production minification - using esbuild (faster, built-in)
      minify: isProd ? "esbuild" : false,

      // Esbuild minification options
      esbuildOptions: isProd
        ? {
            drop: ["console", "debugger"],
            legalComments: "none",
          }
        : undefined,

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
      emptyOutDir: true,
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "lucide-react",
        "@radix-ui/react-alert-dialog",
        "@radix-ui/react-dialog",
        "@radix-ui/react-label",
        "@radix-ui/react-progress",
        "@radix-ui/react-radio-group",
        "@radix-ui/react-select",
        "@radix-ui/react-separator",
        "@radix-ui/react-slider",
        "@radix-ui/react-slot",
        "@radix-ui/react-tabs",
        "@radix-ui/react-toggle",
        "@radix-ui/react-toggle-group",
        "@radix-ui/react-tooltip",
        "clsx",
        "tailwind-merge",
      ],
      force: isDev, // Force re-optimize in development
      esbuildOptions: {
        target: "es2020",
      },
    },

    // Environment variables and defines
    define: {
      __DEV__: JSON.stringify(isDev),
      __PROD__: JSON.stringify(isProd),
      "process.env.NODE_ENV": JSON.stringify(mode),
    },

    // Experimental features
    experimental: {
      renderBuiltUrl(filename) {
        // Custom URL handling for assets if needed
        return filename;
      },
    },

    // CSS configuration
    css: {
      devSourcemap: isDev,
      preprocessorOptions: {
        // Add any CSS preprocessor options here
      },
    },

    // Worker configuration
    worker: {
      format: "es",
      plugins: () => [],
    },

    // Performance configuration
    logLevel: isProd ? "warn" : "info",
    clearScreen: false,

    // Environment-specific configurations
    ...(isProd && {
      // Production-only settings
      base: "/", // Adjust if deploying to subdirectory
      publicDir: "public",
    }),
  };
});
