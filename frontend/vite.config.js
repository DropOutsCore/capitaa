import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks to the real backend. In dev we proxy /api, /healthz and
// /metrics to the Express server so there are no CORS surprises.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/healthz': 'http://localhost:4000',
      '/metrics': 'http://localhost:4000',
    },
  },
  build: {
    // Keep three.js in its own chunk so the rest of the page stays light and
    // Lighthouse-friendly.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
