import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '~backend/client': path.resolve(__dirname, './client'),
      '~backend': path.resolve(__dirname, '../backend'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173', 'https://*.encr.app', 'https://*.supabase.co'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
    },
    headers: {
      // Security headers for development
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss: https://*.supabase.co https://*.encr.app; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https:;",
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
    // Production build optimizations
    minify: 'esbuild', // Always minify for production
    sourcemap: false, // Disable source maps in production for security
    target: 'es2020', // Modern browser target for better optimization
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Supabase in its own chunk (database client, no React dependencies)
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Only truly safe utilities in separate chunk
            if (id.includes('date-fns')) {
              return 'utils';
            }
            // Everything else goes in vendor with React to prevent dependency loading issues
            // This includes all UI libraries, React ecosystem, and any potentially React-dependent code
            return 'vendor';
          }
        },
      },
    },
  },
  define: {
    // Ensure environment variables are properly defined
    __DEV__: process.env.NODE_ENV !== 'production',
  },
  envDir: '.',
})
