import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import storage from './api/storage.js';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      crypto: resolve('src/node-crypto.js'),
    },
  },
  plugins: [
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
