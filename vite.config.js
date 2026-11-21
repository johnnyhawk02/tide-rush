import { defineConfig } from 'vite';

// One self-contained script and relative paths, so the build runs from any folder or static host.
export default defineConfig({
  base: './',
  assetsInclude: ['**/*.glb'],   // Robyn's model, inlined into the code (see src/robyn.js)
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: { output: { entryFileNames: 'game.js', chunkFileNames: 'game-[name].js', assetFileNames: '[name][extname]', inlineDynamicImports: true } },
  },
});
