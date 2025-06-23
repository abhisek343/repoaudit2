import React, { useState, useEffect } from 'react';
import { getVisualizationsData } from '../services/VisualizationService';

export const InteractiveArchitectureVisualizations: React.FC = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    getVisualizationsData().then(data => setData(data.interactiveArchitecture));
  }, []);

  return <div>{JSON.stringify(data, null, 2)}</div>;
};

import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: true, maxTextSize: 90000 });

export const SystemArchitecture: React.FC = () => {
  const [data, setData] = useState<{ mermaidDiagram: string } | null>(null);

  useEffect(() => {
    getVisualizationsData().then(data => setData(data.systemArchitecture));
  }, []);

  useEffect(() => {
    if (data && data.mermaidDiagram) {
      mermaid.contentLoaded();
    }
  }, [data]);

  return (
    <div>
      {data && data.mermaidDiagram ? (
        <div className="mermaid">{data.mermaidDiagram}</div>
      ) : (
        'Loading...'
      )}
    </div>
  );
};

export const VulnerabilityDistribution: React.FC = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    getVisualizationsData().then(data => setData(data.vulnerabilityDistribution));
  }, []);

  return <div>{JSON.stringify(data, null, 2)}</div>;
};

export const ComplexityScatterPlot: React.FC = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    getVisualizationsData().then(data => setData(data.complexityScatterPlot));
  }, []);

  return <div>{JSON.stringify(data, null, 2)}</div>;
};