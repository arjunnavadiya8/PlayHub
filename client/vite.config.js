import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // Avoid native dependency pre-bundling on locked-down Windows machines.
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { port: 5173, strictPort: true }
});
