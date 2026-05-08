import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages, the workflow sets VITE_BASE_PATH to /repo-name/.
// For local dev, ./ keeps assets portable.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  plugins: [react()],
});
