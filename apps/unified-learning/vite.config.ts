import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig(({mode})=>({plugins:[react()],define:mode==='android'?{'import.meta.env.VITE_API_BASE':JSON.stringify('https://learn.iqlabsacademy.com/api')}:undefined,resolve:{alias:{'@edullm/content-schema':resolve(__dirname,'../../packages/content-schema/src/index.ts')}},server:{host:'0.0.0.0',port:5176,strictPort:true}}));
