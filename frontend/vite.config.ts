import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // No base path needed - served from root with /!path fallback
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '~backend/client': path.resolve(__dirname, './client'),
      '~backend': path.resolve(__dirname, '../backend'),
    },
  },

  plugins: [
    tailwindcss(),
    react(),
  ],

  server: {
    port: 5173,
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://*.encr.app',
        'https://*.supabase.co'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
    },
    headers: {
      // Security headers for dev (Encore will add stronger in prod)
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss: http://localhost:4000 http://127.0.0.1:4000 https://*.supabase.co https://*.encr.app; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https:;",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    }
  },

  build: {
    outDir: 'dist',       // Build to ./frontend/dist (backend copies this)
    assetsDir: 'assets',  // Encore will serve under /frontend/assets/
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
    target: 'es2020',
    
    // Ensure clean builds
    chunkSizeWarningLimit: 2000,

    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) {
              return 'supabase'
            }
            if (id.includes('date-fns')) {
              return 'utils'
            }
            return 'vendor'
          }
        },
      },
    },
  },

  define: {
    __DEV__: process.env.NODE_ENV !== 'production',
  },

  envDir: '.',
})
