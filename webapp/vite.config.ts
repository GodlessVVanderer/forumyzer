import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite config for the standalone webapp
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: './',
    publicDir: 'public',
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html')
      }
    },
    define: {
      'process.env': {},
      'process.env.VITE_BACKEND_URL': JSON.stringify(env.VITE_BACKEND_URL),
      'process.env.VITE_OAUTH_CLIENT_ID': JSON.stringify(env.VITE_OAUTH_CLIENT_ID)
    }
  };
});