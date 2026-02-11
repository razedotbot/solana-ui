import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // vm polyfill uses eval by design; safe since app never calls vm.runInThisContext
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
  
  // Pre-bundle dependencies that have CommonJS issues
  optimizeDeps: {
    include: [
      '@solana/web3.js',
      '@solana/spl-token',
      '@solana/spl-token-registry',
      'bs58',
      'buffer',
      'bip39',
      'ed25519-hd-key',
      'crypto-js',
    ],
    esbuildOptions: {
      target: 'es2020',
      // Define global for CommonJS modules
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'EVAL' && warning.id?.includes('vm-browserify')) return;
        warn(warning);
      },
      output: {
        // Simplified chunking - only split truly independent ESM libraries
        // Avoid splitting CommonJS modules which can break require() calls
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('@solana/web3.js') || id.includes('@solana/spl-token')) return 'vendor-solana';
          }
        },
        
        // Optimize chunk size
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
    },
    
    // Optimize build performance
    target: 'es2020',
    minify: 'esbuild', // Use esbuild instead of terser for better compatibility
    // Note: esbuild minification is faster and more reliable than terser
    
    chunkSizeWarningLimit: 1024,
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Improve tree shaking
    reportCompressedSize: true,
    
    // Source maps for production debugging (optional, can be disabled for smaller builds)
    sourcemap: false,
    
    // CommonJS options for better compatibility
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto'
    }
  },
  
  // Ensure proper module format
  modulePreload: {
    polyfill: true
  },
  
  // Development server configuration
  server: {
    port: 3010,
    host: '0.0.0.0',
    
    // Allow all hosts (no restrictions)
    allowedHosts: true,
    
    // Add Permissions Policy headers for clipboard access
    headers: {
      'Permissions-Policy': 'clipboard-read=*, clipboard-write=*'
    },
    
    strictPort: false,
    
    // File system options
    fs: {
      strict: false
    }
  },
  
  // Preview server configuration (for production builds)
  preview: {
    port: 3010,
    headers: {
      'Permissions-Policy': 'clipboard-read=*, clipboard-write=*'
    }
  }
});