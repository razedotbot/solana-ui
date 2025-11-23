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
        manualChunks(id) {
          // Core vendor libraries
          if (id.includes('node_modules')) {
            // React core - always used
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            
            // React Router - used on most pages
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            
            // Solana - these are large, keep separate
            if (id.includes('@solana/web3.js')) {
              return 'vendor-solana-web3';
            }
            if (id.includes('@solana/spl-token')) {
              return 'vendor-solana-spl';
            }
            if (id.includes('@jup-ag/api')) {
              return 'vendor-jupiter';
            }
            
            // UI libraries - group smaller ones together
            if (id.includes('lucide-react')) {
              return 'vendor-ui-icons';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-ui-radix';
            }
            
            // Heavy libraries - separate chunks
            if (id.includes('d3')) {
              return 'vendor-d3';
            }
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas';
            }
            
            // Crypto and encoding libraries - group together (all small)
            if (id.includes('bs58') || id.includes('buffer') || 
                id.includes('crypto-js') || id.includes('bip39') || 
                id.includes('ed25519')) {
              return 'vendor-crypto';
            }
            
            // Other utilities
            if (id.includes('js-cookie') || id.includes('clsx') || 
                id.includes('tailwind-merge') || id.includes('class-variance')) {
              return 'vendor-utils';
            }
            
            // Everything else
            return 'vendor-misc';
          }
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
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true
      }
    },
    
    // Set chunk size warning limit (increased to 600KB since we're splitting more)
    chunkSizeWarningLimit: 600,
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Improve tree shaking
    reportCompressedSize: true,
    
    // Source maps for production debugging (optional, can be disabled for smaller builds)
    sourcemap: false
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