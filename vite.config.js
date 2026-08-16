import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// JavaScript Obfuscator plugin configuration for anti-piracy protection
let obfuscatorPlugin;
try {
  const obfuscatorModule = require('vite-plugin-javascript-obfuscator');
  const obfuscator = obfuscatorModule.default || obfuscatorModule;
  obfuscatorPlugin = obfuscator({
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: false,
    debugProtection: true,
    debugProtectionInterval: 2000,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 0.8,
    unicodeEscapeSequence: false
  });
} catch (e) {
  console.warn('Obfuscator plugin fallback mode:', e.message);
  obfuscatorPlugin = null;
}

export default defineConfig({
  plugins: [
    react(),
    ...(obfuscatorPlugin ? [obfuscatorPlugin] : [])
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },
  },
});
