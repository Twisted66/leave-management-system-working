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
    headers: {
      // Security headers for development
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss: https://*.supabase.co; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https:;",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    }
  },
  build: {
    // Production build optimizations
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Bundle all React ecosystem libraries together to prevent dependency issues
            if (id.includes('react') || 
                id.includes('react-dom') || 
                id.includes('@radix-ui') || 
                id.includes('@tanstack/react-query') ||
                id.includes('react-router') ||
                id.includes('react-day-picker')) {
              return 'vendor';
            }
            // Supabase in its own chunk
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Other utility libraries
            return 'libs';
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
