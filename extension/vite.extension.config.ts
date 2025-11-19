import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';

// Custom Vite configuration for the Forumyzer Chrome extension.
// It defines multiple entry points (popup and background) and preserves
// the file names expected by the manifest.

export default defineConfig(({ mode }) => {
  // Load environment variables for Vite (e.g. VITE_BACKEND_URL, VITE_OAUTH_CLIENT_ID)
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: '.',
    plugins: [
      react(),
      // Custom plugin to copy manifest and static files
      {
        name: 'copy-extension-files',
        closeBundle() {
          // Copy manifest.json
          copyFileSync('manifest.json', 'dist/manifest.json');

          // Copy contentScript.js
          copyFileSync('contentScript.js', 'dist/contentScript.js');

          // Copy icons folder
          mkdirSync('dist/icons', { recursive: true });
          const iconFiles = readdirSync('icons');
          iconFiles.forEach(file => {
            copyFileSync(`icons/${file}`, `dist/icons/${file}`);
          });

          console.log('✓ Copied manifest.json, contentScript.js, and icons to dist/');
        }
      }
    ],
    define: {
      'process.env': {},
      'process.env.VITE_BACKEND_URL': JSON.stringify(env.VITE_BACKEND_URL),
      'process.env.VITE_OAUTH_CLIENT_ID': JSON.stringify(env.VITE_OAUTH_CLIENT_ID)
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html'),
          background: path.resolve(__dirname, 'background.js')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') {
              return 'background.js';
            }
            // name 'index' corresponds to the popup
            return '[name].js';
          }
        }
      }
    }
  };
});