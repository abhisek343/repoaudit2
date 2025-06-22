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
      // Proxy SSE endpoint with no timeout for analyze
      '/api/analyze': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: false,
        timeout: 0,
        configure: (proxy) => {
          proxy.on('proxyReq', proxyReq => {
            // Ensure SSE requests have correct headers
            proxyReq.setHeader('Accept', 'text/event-stream');
            proxyReq.setHeader('Cache-Control', 'no-cache');
          });
          proxy.on('proxyRes', proxyRes => {
            proxyRes.headers['cache-control'] = 'no-cache';
            proxyRes.headers['connection'] = 'keep-alive';
            proxyRes.headers['x-accel-buffering'] = 'no';
          });
        }
      },
      // Other API routes
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: false
      }
    }
  }
});
