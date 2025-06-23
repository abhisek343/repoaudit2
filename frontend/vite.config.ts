import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { // This section should be fine as is, but ensure lucide-react doesn't cause issues
    exclude: ['lucide-react'],
  }, // Added comma here
  server: {
    host: true, // Make server accessible on the network
    proxy: {
      // Proxy SSE endpoint with no timeout for analyze
      '/api/analyze': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: false,
        timeout: 0,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            // Remove and reset connection header
            proxyReq.removeHeader('connection');
            proxyReq.setHeader('connection', 'keep-alive');
            // silenced proxy request log
          });
        },
      },
      // Other API routes
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: false
      }
    },
  }
});
