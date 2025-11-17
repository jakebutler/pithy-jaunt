import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { isSentryEnabled } from './lib/sentry/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file (Vite doesn't do this automatically like Next.js)
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

export default defineConfig({
  server: {
    port: 3000,
  },
  ssr: {
    noExternal: ['@tanstack/react-start', '@tanstack/react-router'],
  },
  resolve: {
    conditions: ['import', 'module', 'browser', 'default'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@tanstack/react-start-client'],
  },
  define: {
    // Expose NEXT_PUBLIC_ env vars for compatibility
    'process.env.NEXT_PUBLIC_CONVEX_URL': JSON.stringify(process.env.NEXT_PUBLIC_CONVEX_URL || process.env.VITE_CONVEX_URL),
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    'process.env.NEXT_PUBLIC_SENTRY_DSN': JSON.stringify(process.env.NEXT_PUBLIC_SENTRY_DSN || ''),
  },
  build: {
    sourcemap: true, // Generate source maps for production
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({
      srcDirectory: 'src',
      router: {
        routesDirectory: 'routes',
      },
    }),
    viteReact(),
    // Sentry plugin for source map upload (only in production builds)
    // Uploads client-side source maps to the client project
    ...(isSentryEnabled() && process.env.NODE_ENV === 'production'
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT_CLIENT || process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
              assets: './dist/**',
              ignore: ['node_modules'],
            },
            release: {
              name: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
            },
          }),
        ]
      : []),
  ],
})

