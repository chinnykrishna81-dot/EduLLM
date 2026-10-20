import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({plugins:[react()],resolve:{alias:{'@edullm/content-schema':resolve(__dirname,'../../packages/content-schema/src/index.ts')}},server:{host:'0.0.0.0',port:5176,strictPort:true}});
