import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RefreshCw, Download, Copy, Maximize2, Minimize2, Info, Layers, FileText, GitBranch, Brain, AlertTriangle } from 'lucide-react';
import { ExtendedFileInfo } from '../../types';

export interface ExtendedFileInfo extends BaseFileInfo {
  type: string;
  dependencies: string[];
  contributors: string[];
  commitCount: number;
  functions?: {
    name: string;
    complexity: number;
    dependencies: string[];
    calls: string[];
    description?: string;
  }[];
}

interface ArchitectureDiagramProps {
  diagram: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  interactive?: boolean;
  fileInfo?: Record<string, ExtendedFileInfo>;
  showDetails?: boolean;
  onNodeClick?: (nodeId: string, nodeInfo: ExtendedFileInfo) => void;
  useLLM?: boolean;
}

const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({
  diagram,
  title,
  description,
  width = 800,
  height = 600,
  theme = 'default',
  interactive = true,
  fileInfo = {},
  showDetails = true,
  onNodeClick,
  useLLM = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ExtendedFileInfo | null>(null);
  const [showMetrics, setShowMetrics] = useState(true);
  const [isLLMAvailable, setIsLLMAvailable] = useState(true);
  const [detailedView, setDetailedView] = useState(false);
  const uniqueId = useId();
  const mermaidInitialized = useRef(false);

  // Initialize mermaid
  useEffect(() => {
    if (!mermaidInitialized.current) {
      mermaid.initialize({
        startOnLoad: false,
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
      mermaidInitialized.current = true;
    }
  }, []);

  // Check LLM availability
  useEffect(() => {
    if (useLLM) {
      // Simulate LLM availability check
      const checkLLM = async () => {
        try {
          // Replace with actual LLM availability check
          const response = await fetch('/api/llm/check');
          setIsLLMAvailable(response.ok);
        } catch (error) {
          console.warn('LLM service not available:', error);
          setIsLLMAvailable(false);
        }
      };
      checkLLM();
    }
  }, [useLLM]);

  // Generate detailed diagram with LLM
  const generateDetailedDiagram = async (baseDiagram: string) => {
    if (!useLLM || !isLLMAvailable) {
      return baseDiagram;
    }

    try {
      // Replace with actual LLM API call
      const response = await fetch('/api/llm/enhance-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagram: baseDiagram, fileInfo })
      });

      if (!response.ok) {
        throw new Error('Failed to enhance diagram with LLM');
      }

      const { enhancedDiagram } = await response.json();
      return enhancedDiagram;
    } catch (error) {
      console.warn('Failed to enhance diagram with LLM:', error);
      return baseDiagram;
    }
  };

  // Render diagram
  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Clean and validate diagram syntax
        const cleanDiagram = diagram.trim();
        if (!cleanDiagram) {
          throw new Error('Empty diagram');
        }

        // Generate unique ID for this diagram instance
        const diagramId = `architecture-diagram-${uniqueId.replace(/:/g, '-')}`;
        
        // Add click directives to the diagram if interactive
        let diagramWithClicks = cleanDiagram;
        if (interactive) {
          // Extract node IDs from the diagram
          const nodeMatches = cleanDiagram.match(/[A-Za-z0-9]+\["[^"]+"\]/g) || [];
          const nodeIds = nodeMatches.map(match => match.split('[')[0]);
          
          // Add click directives for each node
          const clickDirectives = nodeIds.map(nodeId => 
            `click ${nodeId} call handleMermaidClick_${uniqueId.replace(/:/g, '-')}("${nodeId}") "Click for details"`
          ).join('\n');
          
          diagramWithClicks = `${cleanDiagram}\n\n${clickDirectives}`;
        }

        // Generate detailed diagram if requested
        const finalDiagram = detailedView ? 
          await generateDetailedDiagram(diagramWithClicks) : 
          diagramWithClicks;
        
        // Expose the click handler to the global scope
        (window as any)[`handleMermaidClick_${uniqueId.replace(/:/g, '-')}`] = (nodeId: string) => {
          const nodeInfo = fileInfo[nodeId];
          if (nodeInfo) {
            setSelectedNode(nodeInfo);
            if (onNodeClick) {
              onNodeClick(nodeId, nodeInfo);
            }
          }
        };
        
        // Render diagram
        const { svg } = await mermaid.render(diagramId, finalDiagram);
        
        if (!isMounted) return;
        
        // Create a temporary container to parse the SVG
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svg;
        const svgElement = tempDiv.querySelector('svg');
        
        if (!svgElement) {
          throw new Error('Failed to parse rendered SVG');
        }

        // Set SVG attributes for proper display
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        // Fix self-closing tags in the SVG
        const fixedSvg = svgElement.outerHTML
          .replace(/<br>/g, '<br/>')
          .replace(/<br\s*>/g, '<br/>')
          .replace(/<br\s*\/>/g, '<br/>');
        
        // Update the diagram SVG state
        setDiagramSvg(fixedSvg);

      } catch (err) {
        if (isMounted) {
          console.error('Error rendering diagram:', err);
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    renderDiagram();

    // Cleanup function
    return () => {
      isMounted = false;
      // Remove the global click handler
      delete (window as any)[`handleMermaidClick_${uniqueId.replace(/:/g, '-')}`];
    };
  }, [diagram, interactive, fileInfo, onNodeClick, uniqueId, detailedView, useLLM, isLLMAvailable]);

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!diagramSvg) return;

    const blob = new Blob([diagramSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'architecture'}-diagram.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle copy
  const handleCopy = () => {
    navigator.clipboard.writeText(diagram);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Title and Description */}
      {title && (
        <div className="w-full mb-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-2 text-gray-600">{description}</p>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="w-full mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(0.1)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title="Reset zoom"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {useLLM && (
            <button
              onClick={() => setDetailedView(!detailedView)}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                detailedView 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={detailedView ? "Disable detailed view" : "Enable detailed view"}
              disabled={!isLLMAvailable}
            >
              <Brain className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title="Download SVG"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title="Copy diagram code"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* LLM Status */}
      {useLLM && !isLLMAvailable && (
        <div className="w-full mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <p className="text-sm text-yellow-700">
            LLM service is not available. Using basic diagram view.
          </p>
        </div>
      )}

      {/* Diagram Container */}
      <div
        ref={containerRef}
        className="w-full h-full flex justify-center items-center bg-white rounded-lg border overflow-auto"
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center',
          transition: 'transform 0.2s ease-in-out'
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">{error}</div>
        ) : (
          <div 
            className="mermaid-container w-full h-full"
            dangerouslySetInnerHTML={{ __html: diagramSvg || '' }}
          />
        )}
      </div>

      {/* Node Details Panel */}
      {selectedNode && showDetails && (
        <div className="w-full mt-4 p-4 bg-white rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedNode.name}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Path</p>
              <p className="font-medium">{selectedNode.path}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Type</p>
              <p className="font-medium">{selectedNode.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Size</p>
              <p className="font-medium">{selectedNode.size} bytes</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Complexity</p>
              <p className="font-medium">{selectedNode.complexity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Modified</p>
              <p className="font-medium">{selectedNode.lastModified ? new Date(selectedNode.lastModified).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Commit Count</p>
              <p className="font-medium">{selectedNode.commitCount}</p>
            </div>
          </div>
          {selectedNode.dependencies && selectedNode.dependencies.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Dependencies</p>
              <div className="flex flex-wrap gap-2">
                {selectedNode.dependencies.map((dep, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
          {selectedNode.contributors && selectedNode.contributors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Contributors</p>
              <div className="flex flex-wrap gap-2">
                {selectedNode.contributors.map((contributor, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {contributor}
                  </span>
                ))}
              </div>
            </div>
          )}
          {selectedNode.functions && selectedNode.functions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Functions</p>
              <div className="space-y-2">
                {selectedNode.functions.map((func, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded">
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-medium text-purple-600">{func.name}</code>
                      <span className={`px-2 py-1 rounded text-xs ${
                        func.complexity >= 70 ? 'bg-red-100 text-red-800' :
                        func.complexity >= 50 ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {func.complexity}% complex
                      </span>
                    </div>
                    {func.description && (
                      <p className="text-sm text-gray-600 mt-1">{func.description}</p>
                    )}
                    {func.dependencies && func.dependencies.length > 0 && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-500">Dependencies:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {func.dependencies.map((dep, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                              {dep}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {func.calls && func.calls.length > 0 && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-500">Calls:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {func.calls.map((call, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                              {call}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArchitectureDiagram; 