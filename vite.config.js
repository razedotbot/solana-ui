import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for specific globals and modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Enable polyfills for specific modules (e.g., crypto, stream, etc.)
      protocolImports: true,
    }),
    checker({
      overlay: true,
      typescript: {
        tsconfigPath: 'tsconfig.json',
      },
      eslint: {
        lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
      },
    }),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-solana': ['@solana/web3.js', '@solana/spl-token'],
          'vendor-ui': ['lucide-react', 'framer-motion', 'react-split'],
          'vendor-utils': ['bs58', 'buffer', 'crypto-js', 'd3'],

          'operations': [
            './src/utils/bonkcreate.ts',
            './src/utils/cookcreate.ts',
            './src/utils/consolidate.ts',
            './src/utils/distribute.ts',
            './src/utils/mixer.ts'
          ],
          
          // Modal components
          'modals': [
            './src/modals/CalculatePNLModal.tsx'
          ],
          
          // Page components
          'pages': [
            './src/Wallets.tsx',
            './src/Frame.tsx',
            './src/Actions.tsx',
            './src/Mobile.tsx'
          ],
          
          // Core components
          'components': [
            './src/components/TradingForm.tsx',
            './src/components/PnlCard.tsx'
          ]
        },
        
        // Optimize chunk size
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop().replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        }
      }
    },
    
    // Optimize build performance
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // Set chunk size warning limit
    chunkSizeWarningLimit: 500
  },
  
  // Development server configuration
  server: {
    port: 3000,
    host: true,
    
    allowedHosts: ['localhost', '127.0.0.1', '.ngrok-free.app'],
    
    // Add Permissions Policy headers for clipboard access
    headers: {
      'Permissions-Policy': 'clipboard-read=*, clipboard-write=*'
    }
  },
  
  // Preview server configuration (for production builds)
  preview: {
    port: 3000,
    headers: {
      'Permissions-Policy': 'clipboard-read=*, clipboard-write=*'
    }
  }
});