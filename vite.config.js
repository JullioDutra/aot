import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: { rollupOptions: { input: {
    trost: fileURLToPath(new URL('./index.html', import.meta.url)),
    arena: fileURLToPath(new URL('./arena.html', import.meta.url)),
  } } },
});
