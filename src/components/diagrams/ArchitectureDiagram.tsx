import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RefreshCw, Download, Copy, Maximize2, Minimize2, Info, Layers, FileText, GitBranch } from 'lucide-react';

interface FileInfo {
  path: string;
  type: string;
  size: number;
  lastModified: string;
  complexity: number;
  dependencies: string[];
  contributors: string[];
  commitCount: number;
}

interface ArchitectureDiagramProps {
  diagram: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  interactive?: boolean;
  fileInfo?: Record<string, FileInfo>;
  showDetails?: boolean;
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
  showDetails = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(true);

  // Initialize mermaid with custom theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: theme,
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
        topPadding: 50,
        sidePadding: 100,
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
  }, [theme]);

  // Render diagram
  useEffect(() => {
    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Clean and validate diagram syntax
        const cleanDiagram = diagram.trim();
        if (!cleanDiagram) {
          throw new Error('Empty diagram');
        }

        // Render diagram
        const { svg } = await mermaid.render('architecture-diagram', cleanDiagram);
        setDiagramSvg(svg);

        // Add interactivity to SVG elements
        if (interactive && containerRef.current) {
          const svgElement = containerRef.current.querySelector('svg');
          if (svgElement) {
            // Function to handle node selection
            const handleNodeClick = (node: Element, nodeId: string) => {
              // Remove selection from all nodes
              svgElement.querySelectorAll('.node, .actor, .label').forEach(n => {
                n.classList.remove('selected');
              });
              
              // Add selection to clicked node
              node.classList.add('selected');
              
              // Update selected node state
              setSelectedNode(nodeId);
              
              // Log for debugging
              console.log('Node clicked:', nodeId);
              console.log('Node info:', fileInfo[nodeId]);
            };

            // Add click handlers to all clickable elements
            const addClickHandlers = () => {
              // Handle node clicks
              svgElement.querySelectorAll('.node').forEach(node => {
                const nodeId = node.getAttribute('id')?.replace('flowchart-', '');
                if (nodeId && fileInfo[nodeId]) {
                  node.setAttribute('data-node-id', nodeId);
                  node.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleNodeClick(node, nodeId);
                  });
                }
              });

              // Handle label clicks
              svgElement.querySelectorAll('.label').forEach(label => {
                const nodeId = label.textContent?.split('\n')[0].trim();
                if (nodeId && fileInfo[nodeId]) {
                  label.setAttribute('data-node-id', nodeId);
                  label.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleNodeClick(label, nodeId);
                  });
                }
              });

              // Handle text clicks
              svgElement.querySelectorAll('text').forEach(text => {
                const nodeId = text.textContent?.split('\n')[0].trim();
                if (nodeId && fileInfo[nodeId]) {
                  text.setAttribute('data-node-id', nodeId);
                  text.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleNodeClick(text, nodeId);
                  });
                }
              });
            };

            // Initial setup of click handlers
            addClickHandlers();

            // Add hover effects
            const addHoverEffects = () => {
              svgElement.querySelectorAll('[data-node-id]').forEach(element => {
                const nodeId = element.getAttribute('data-node-id');
                
                element.addEventListener('mouseover', () => {
                  element.classList.add('hover');
                  if (nodeId) {
                    const connectedElements = svgElement.querySelectorAll(`[data-connected-to="${nodeId}"]`);
                    connectedElements.forEach(el => el.classList.add('connected-hover'));
                  }
                });

                element.addEventListener('mouseout', () => {
                  element.classList.remove('hover');
                  if (nodeId) {
                    const connectedElements = svgElement.querySelectorAll(`[data-connected-to="${nodeId}"]`);
                    connectedElements.forEach(el => el.classList.remove('connected-hover'));
                  }
                });
              });
            };

            // Add hover effects
            addHoverEffects();

            // Add click handler to clear selection
            svgElement.addEventListener('click', (e) => {
              if (e.target === svgElement) {
                setSelectedNode(null);
                svgElement.querySelectorAll('.node, .actor, .label').forEach(n => {
                  n.classList.remove('selected');
                });
              }
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [diagram, interactive, fileInfo]);

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

  // Get selected node info
  const selectedNodeInfo = selectedNode ? fileInfo[selectedNode] : null;

  // Debug selected node
  useEffect(() => {
    if (selectedNode) {
      console.log('Selected node:', selectedNode);
      console.log('Node info:', fileInfo[selectedNode]);
    }
  }, [selectedNode, fileInfo]);

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
      <div className="w-full mb-4 flex items-center justify-between">
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
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title={showMetrics ? "Hide metrics" : "Show metrics"}
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title="Copy diagram code"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title="Download diagram"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full gap-4">
        {/* Diagram Container */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-auto bg-white rounded-lg shadow-lg"
          style={{
            width: isFullscreen ? '100vw' : width,
            height: isFullscreen ? '100vh' : height,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-in-out',
          }}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-red-500 text-center p-4">
                <p className="font-semibold">Error rendering diagram</p>
                <p className="text-sm mt-2">{error}</p>
              </div>
            </div>
          ) : (
            <div
              className="mermaid-diagram"
              dangerouslySetInnerHTML={{ __html: diagramSvg || '' }}
            />
          )}
        </div>

        {/* Details Panel */}
        {showDetails && showMetrics && (
          <div className="w-80 bg-white rounded-lg shadow-lg p-4 overflow-auto">
            {selectedNodeInfo ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold">{selectedNodeInfo.path}</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Type: {selectedNodeInfo.type}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Dependencies: {selectedNodeInfo.dependencies.length}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Metrics</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm">
                        <span className="text-gray-500">Size:</span>
                        <span className="ml-2">{selectedNodeInfo.size} bytes</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Complexity:</span>
                        <span className="ml-2">{selectedNodeInfo.complexity}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Commits:</span>
                        <span className="ml-2">{selectedNodeInfo.commitCount}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Modified:</span>
                        <span className="ml-2">{new Date(selectedNodeInfo.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {selectedNodeInfo.dependencies.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Dependencies</h4>
                      <div className="space-y-1">
                        {selectedNodeInfo.dependencies.map((dep, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {dep}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedNodeInfo.contributors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Contributors</h4>
                      <div className="space-y-1">
                        {selectedNodeInfo.contributors.map((contributor, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {contributor}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p>Select a node to view details</p>
                <p className="text-sm mt-2">Click on any component in the diagram</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .mermaid-diagram {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mermaid-diagram svg {
          max-width: 100%;
          max-height: 100%;
        }

        .mermaid-diagram .node {
          transition: all 0.2s ease-in-out;
          cursor: pointer;
        }

        .mermaid-diagram .node.hover {
          filter: brightness(1.1);
          transform: scale(1.05);
        }

        .mermaid-diagram .node.selected {
          stroke: #4299e1;
          stroke-width: 3px;
          filter: brightness(1.1);
        }

        .mermaid-diagram .edgePath {
          transition: all 0.2s ease-in-out;
        }

        .mermaid-diagram .edgePath.connected-hover {
          stroke: #4299e1;
          stroke-width: 2px;
        }

        .mermaid-diagram .label {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 14px;
          cursor: pointer;
        }

        .mermaid-diagram .label.selected {
          font-weight: bold;
          color: #4299e1;
        }

        .mermaid-diagram text {
          cursor: pointer;
        }

        .mermaid-diagram text.selected {
          font-weight: bold;
          fill: #4299e1;
        }

        .mermaid-diagram .cluster {
          fill: #f7fafc;
          stroke: #e2e8f0;
          stroke-width: 1px;
          rx: 4;
          ry: 4;
        }

        .mermaid-diagram .cluster:hover {
          fill: #edf2f7;
        }

        .mermaid-diagram .edgeLabel {
          background-color: white;
          padding: 2px 4px;
          border-radius: 2px;
          font-size: 12px;
        }

        .mermaid-diagram .edgeLabel:hover {
          background-color: #f7fafc;
        }

        /* Dark theme overrides */
        .dark .mermaid-diagram .cluster {
          fill: #2d3748;
          stroke: #4a5568;
        }

        .dark .mermaid-diagram .cluster:hover {
          fill: #4a5568;
        }

        .dark .mermaid-diagram .edgeLabel {
          background-color: #2d3748;
          color: #e2e8f0;
        }

        .dark .mermaid-diagram .edgeLabel:hover {
          background-color: #4a5568;
        }
      `}</style>
    </div>
  );
};

export default ArchitectureDiagram; 