import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import mermaid from 'mermaid';
import App from './App.tsx';
import './index.css';

// Initialize Mermaid with minimal configuration
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
});

// Render the app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Run Mermaid after the app is rendered
mermaid.run({
  querySelector: '.mermaid',
});
