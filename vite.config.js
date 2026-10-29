import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // three.js alone is ~556 kB minified (142 kB gzip); the warning would only flag the engine.
  build: { chunkSizeWarningLimit: 600, rollupOptions: {
    input: {
      trost: fileURLToPath(new URL('./index.html', import.meta.url)),
      arena: fileURLToPath(new URL('./arena.html', import.meta.url)),
      historia: fileURLToPath(new URL('./historia.html', import.meta.url)),
    },
    // Three.js is shared by both pages; give it a stable, honest chunk name.
    output: { manualChunks: { three: ['three'] } },
  } },
});
