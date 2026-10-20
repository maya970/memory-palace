import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import storage from './api/storage.js';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['@mysten/walrus-wasm'],
  },
  plugins: [
    {
      name: 'arbundles-crypto-shim',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source !== 'crypto' && source !== 'node:crypto') return null;
        if (!importer || !importer.replaceAll('\\', '/').includes('/arbundles/')) return null;
        return resolve('src/node-crypto.js');
      },
    },
    {
      name: 'storage-api',
      configureServer(server) {
        server.middlewares.use('/api/storage', (req, res) => {
          storage(req, res);
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        library: resolve('library.html'),
      },
    },
  },
});
