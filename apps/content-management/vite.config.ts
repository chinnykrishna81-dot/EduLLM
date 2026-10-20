import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: { alias: { '@edullm/content-schema': resolve(__dirname, '../../packages/content-schema/src/index.ts') } },
  server: {
    port: 5174,
    strictPort: true,
  },
});
