import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { // This section should be fine as is, but ensure lucide-react doesn't cause issues
    exclude: ['lucide-react'],
  }, // Added comma here
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        // keep-alive for SSE; disable ws so it does not treat it as websocket
        ws: false,        // Configure proxy for streaming responses
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Ensure streaming responses aren't buffered
            if (req.url?.includes('/analyze')) {
              proxyReq.setHeader('Cache-Control', 'no-cache');
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            // Ensure SSE responses aren't buffered by proxy
            if (req.url?.includes('/analyze')) {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['connection'] = 'keep-alive';
              proxyRes.headers['x-accel-buffering'] = 'no';
            }
          });
        }
      }
    }
  }
});
