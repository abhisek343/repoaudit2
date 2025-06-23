import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import mermaid from 'mermaid';
import { getVisualizationsData } from '../services/VisualizationService';

mermaid.initialize({ startOnLoad: true, maxTextSize: 90000 });

interface VisualizationProps {
  report: AnalysisResult | null;
  repoUrl?: string;
}

export const InteractiveArchitectureVisualizations: React.FC<VisualizationProps> = ({ report, repoUrl }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!report && repoUrl) {
      const fetchData = async () => {
        try {
          const visualizationData = await getVisualizationsData(repoUrl);
          setData(visualizationData);
        } catch (err) {
          setError('Failed to load visualization data');
          console.error('Error fetching visualization data:', err);
        }
      };
      
      fetchData();
    } else if (report) {
      setData(report.advancedAnalysis);
    }
  }, [report, repoUrl]);
  
  if (error) return <div className="text-red-500">{error}</div>;
  
  return <div>{data ? JSON.stringify(data, null, 2) : 'Loading...'}</div>;
};

export const SystemArchitecture: React.FC<VisualizationProps> = ({ report, repoUrl }) => {
  const [diagram, setDiagram] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (report && report.systemArchitecture?.mermaidDiagram) {
        setDiagram(report.systemArchitecture.mermaidDiagram);
      } else if (repoUrl) {
        try {
          const visualizationData = await getVisualizationsData(repoUrl);
          if (visualizationData.systemArchitecture?.mermaidDiagram) {
            setDiagram(visualizationData.systemArchitecture.mermaidDiagram);
          } else {
            setError('No diagram available for this repository');
          }
        } catch (err) {
          setError('Failed to load diagram');
          console.error('Error fetching diagram data:', err);
        }
      }
      setIsLoading(false);
    };
    
    fetchData();
  }, [report, repoUrl]);

  useEffect(() => {
    if (diagram) {
      try {
        // Configure Mermaid with better defaults for our enhanced diagrams
        mermaid.initialize({ 
          startOnLoad: true, 
          maxTextSize: 900000, // Increased for larger diagrams
          securityLevel: 'loose', // Allow all functionality
          theme: 'default',
          fontFamily: 'Roboto, sans-serif',
          fontSize: 14,
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            useMaxWidth: false, // Allow diagram to use full width
            padding: 20,
          },
          themeVariables: {
            primaryColor: '#f4f4f4',
            primaryTextColor: '#333',
            primaryBorderColor: '#ddd',
            lineColor: '#666',
            secondaryColor: '#eaf2f8',
            tertiaryColor: '#f5f5f5'
          }
        });
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          mermaid.contentLoaded();
        }, 100);
      } catch (e) {
        console.error('Error rendering diagram:', e);
        setError('Error rendering architectural diagram');
      }
    }
  }, [diagram]);

  if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">{error}</div>;
  if (isLoading) return <div className="p-4 text-gray-500">Loading system architecture diagram...</div>;

  return (
    <div className="architecture-diagram-container" style={{ margin: '1rem 0' }}>
      {diagram ? (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 overflow-auto" style={{ maxHeight: '80vh' }}>
          <h2 className="text-xl font-semibold mb-4 text-center">System Architecture Diagram</h2>
          <div 
            className="mermaid diagram-container" 
            style={{ 
              minHeight: '500px', 
              width: '100%', 
              overflow: 'auto',
              padding: '1rem'
            }}
          >
            {diagram}
          </div>
          <style>
            {`
              .mermaid {
                font-size: 14px !important;
                display: flex;
                justify-content: center;
              }
              .mermaid svg {
                max-width: none !important;
                height: auto;
                min-width: 800px;
              }
            `}
          </style>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          No system architecture diagram available.
        </div>
      )}
    </div>
  );
};

export const VulnerabilityDistribution: React.FC<VisualizationProps> = ({ report, repoUrl }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (report) {
      setData(report.securityIssues);
    } else if (repoUrl) {
      const fetchData = async () => {
        try {
          const visualizationData = await getVisualizationsData(repoUrl);
          setData(visualizationData.vulnerabilityDistribution);
        } catch (err) {
          setError('Failed to load vulnerability data');
          console.error('Error fetching vulnerability data:', err);
        }
      };
      
      fetchData();
    }
  }, [report, repoUrl]);
  
  if (error) return <div className="text-red-500">{error}</div>;
  
  return <div>{data ? JSON.stringify(data, null, 2) : 'Loading...'}</div>;
};

export const ComplexityScatterPlot: React.FC<VisualizationProps> = ({ report, repoUrl }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (report) {
      setData(report.qualityMetrics);
    } else if (repoUrl) {
      const fetchData = async () => {
        try {
          const visualizationData = await getVisualizationsData(repoUrl);
          setData(visualizationData.complexityScatterPlot);
        } catch (err) {
          setError('Failed to load complexity data');
          console.error('Error fetching complexity data:', err);
        }
      };
      
      fetchData();
    }
  }, [report, repoUrl]);
  
  if (error) return <div className="text-red-500">{error}</div>;
  
  return <div>{data ? JSON.stringify(data, null, 2) : 'Loading...'}</div>;
};