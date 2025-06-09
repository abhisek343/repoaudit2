import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import mermaid from 'mermaid';
import App from './App.tsx';
import './index.css';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    padding: 20,
    useMaxWidth: false,
  },
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
  },
  gantt: {
    titleTopMargin: 25,
    barHeight: 20,
    barGap: 4,
    topPadding: 50
  },
  themeVariables: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '16px',
    primaryColor: '#4299e1',
    primaryTextColor: '#fff',
    primaryBorderColor: '#2b6cb0',
    lineColor: '#e2e8f0',
    secondaryColor: '#48bb78',
    tertiaryColor: '#ed8936',
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
