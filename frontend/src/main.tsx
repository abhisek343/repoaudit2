import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import mermaid from 'mermaid';
import App from './App.tsx';
import './index.css';
import { initializeStorage } from './services/storageService';

// Initialize storage services
initializeStorage().catch(console.error);

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize Mermaid with minimal configuration
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
});

// Suppress console output in production to avoid leaking sensitive data
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  console.warn = noop;
}

// Render the app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);

// Run Mermaid after the app is rendered
mermaid.run({
  querySelector: '.mermaid',
});
