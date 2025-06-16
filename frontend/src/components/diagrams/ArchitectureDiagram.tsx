import React, { useEffect, useRef, useState, useId, useCallback } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RefreshCw, Download, Copy, Maximize2, Minimize2, Brain, AlertTriangle, Loader2 } from 'lucide-react';
import { FileInfo } from '../../types'; // Changed ExtendedFileInfo to FileInfo
// Import client-side LLM helpers, these will call the backend
import { checkLLMAvailability as checkLLMAvailabilityClient, enhanceDiagram as enhanceDiagramClient } from '../../api/llm';

// Extend the Window interface to include our dynamic Mermaid click handlers
declare global {
  interface Window {
    [key: `handleMermaidClick_${string}`]: (nodeId: string) => void;
  }
}


interface ArchitectureDiagramProps {
  diagram: string;
  title?: string;
  description?: string;
  width?: number; // These might not be directly used if SVG is responsive
  height?: number; // These might not be directly used if SVG is responsive
  interactive?: boolean;
  fileInfo?: Record<string, FileInfo>; // Path to FileInfo - Changed ExtendedFileInfo
  showDetails?: boolean;
  onNodeClick?: (nodeId: string, nodeInfo?: FileInfo) => void; // nodeInfo can be undefined - Changed ExtendedFileInfo
  useLLM?: boolean;
  llmConfig?: Record<string, unknown>; // Pass LLM config for backend calls, changed any to Record<string, unknown>
}

const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({
  diagram,
  title,
  description,
  interactive = true,
  fileInfo = {},
  showDetails = true,
  onNodeClick,
  useLLM = true,
  llmConfig // Receive LLM config from props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null); // For the div holding the SVG
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnhancing, setIsEnhancing] = useState(false); // For LLM enhancement loading
  const [error, setError] = useState<string | null>(null);
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<FileInfo | null>(null); // Changed ExtendedFileInfo
  const [isLLMServiceAvailable, setIsLLMServiceAvailable] = useState(true); // Renamed for clarity
  const [detailedViewActive, setDetailedViewActive] = useState(false); // Renamed for clarity
  const uniqueId = useId();
  const mermaidInitialized = useRef(false);

  useEffect(() => {
    if (!mermaidInitialized.current) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: false },
        // ... other mermaid configs
        themeVariables: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '14px', // Slightly smaller default for complex diagrams
          // ... other theme vars
        },
      });
      mermaidInitialized.current = true;
    }
  }, []);
  useEffect(() => {
    const checkService = async () => {
      if (useLLM && llmConfig) {
        try {
          // Pass llmConfig to the check - backend requires it
          const available = await checkLLMAvailabilityClient(llmConfig as unknown as import('../../types').LLMConfig);
          setIsLLMServiceAvailable(available);
        } catch (err) {
          console.warn('LLM service availability check failed:', err);
          setIsLLMServiceAvailable(false);
        }
      } else {
        setIsLLMServiceAvailable(false);
      }
    };
    checkService();
  }, [useLLM, llmConfig]);

  const enhanceDiagramWithLLM = useCallback(async (baseDiagram: string) => {
    if (!useLLM || !isLLMServiceAvailable || !llmConfig || !fileInfo || Object.keys(fileInfo).length === 0) {
      return baseDiagram;
    }
    setIsEnhancing(true);
    try {
      // Call the client-side helper which in turn calls the backend
      const response = await enhanceDiagramClient(baseDiagram, fileInfo); // Removed llmConfig
      if (response.error) {
        console.warn('Failed to enhance diagram with LLM:', response.error);
        setError(`LLM Enhancement Failed: ${response.error}`);
        return baseDiagram;
      }
      return response.enhancedDiagram;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error enhancing diagram';
      console.warn('Error enhancing diagram with LLM:', errorMessage);
      setError(`LLM Enhancement Error: ${errorMessage}`);
      return baseDiagram;
    } finally {
      setIsEnhancing(false);
    }
  }, [useLLM, isLLMServiceAvailable, fileInfo, llmConfig]);

  useEffect(() => {
    let isMounted = true;
    const render = async () => {
      if (!svgContainerRef.current || !diagram) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      setSelectedNodeInfo(null);

      try {
        const cleanDiagram = diagram.trim();
        if (!cleanDiagram) throw new Error('Diagram code is empty.');

        const diagramId = `arch-diag-${uniqueId.replace(/:/g, '-')}`;
        
        let finalDiagram = cleanDiagram;
        // Ensure the diagram starts with 'graph TD' for a vertical layout if it's a flowchart
        // Check if it's a flowchart and doesn't already specify a direction or is empty
        if (finalDiagram.startsWith('graph')) {
            const firstLine = finalDiagram.split('\n')[0];
            if (!firstLine.includes('TD') && !firstLine.includes('LR') && !firstLine.includes('BT') && !firstLine.includes('RL')) {
                // If it's a graph but no direction specified, default to TD
                finalDiagram = `graph TD\n${finalDiagram.substring(firstLine.length).trim()}`;
            }
        } else if (!finalDiagram.startsWith('sequenceDiagram') && !finalDiagram.startsWith('gantt') && !finalDiagram.startsWith('classDiagram')) {
            // If it's not explicitly a graph or another diagram type, assume flowchart and prepend graph TD
            finalDiagram = `graph TD\n${finalDiagram}`;
        }

        if (detailedViewActive) {
            finalDiagram = await enhanceDiagramWithLLM(finalDiagram);
        }
        
        // Add click handlers if interactive
        let diagramWithClicks = finalDiagram;
        if (interactive && Object.keys(fileInfo).length > 0) {
            const nodeIds = Object.keys(fileInfo); // Use fileInfo keys as potential node IDs
            const clickDirectives = nodeIds
                .filter(nodeId => finalDiagram.includes(`"${nodeId}"`) || finalDiagram.includes(`${nodeId}[`) || finalDiagram.includes(` ${nodeId} `) || finalDiagram.includes(`(${nodeId})`)) // More robust check for node presence
                .map(nodeId => `click ${nodeId} call handleMermaidClick_${uniqueId.replace(/:/g, '-')}("${nodeId}") "Details for ${fileInfo[nodeId]?.name || nodeId}"`)
                .join('\n');
            if (clickDirectives) {
                diagramWithClicks = `${finalDiagram}\n\n%% Click Handlers\n${clickDirectives}`;
            }
        }
        
        window[`handleMermaidClick_${uniqueId.replace(/:/g, '-')}`] = (nodeId: string) => {
          const nodeData = fileInfo[nodeId]; // nodeId should be the file path
          if (nodeData) {
            setSelectedNodeInfo(nodeData);
            onNodeClick?.(nodeId, nodeData);
          } else {
            // If not found by path, maybe it's a conceptual node name
            const conceptualNode = Object.values(fileInfo).find(fi => fi.name === nodeId);
            if (conceptualNode) {
                setSelectedNodeInfo(conceptualNode);
                onNodeClick?.(nodeId, conceptualNode);
            } else {
                console.warn(`No FileInfo found for node ID: ${nodeId}`); // Changed ExtendedFileInfo
                onNodeClick?.(nodeId, undefined);
                setSelectedNodeInfo({ name: nodeId, path: 'N/A', size: 0, type: 'file' } as FileInfo); // Basic fallback
            }
          }
        };

        const { svg } = await mermaid.render(diagramId, diagramWithClicks);
        if (!isMounted) return;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svg;
        const svgElement = tempDiv.querySelector('svg');
        if (!svgElement) throw new Error('Failed to parse rendered SVG from Mermaid.');

        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.style.maxWidth = '100%'; // Ensure it scales down
        // svgElement.style.maxHeight = 'calc(100vh - 200px)'; // Example constraint

        setDiagramSvg(svgElement.outerHTML);

      } catch (err) {
        if (isMounted) {
          console.error('Error rendering Mermaid diagram:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
          setError(errorMessage.length > 200 ? errorMessage.substring(0,200) + "..." : errorMessage); // Truncate long errors
          setDiagramSvg(null); // Clear previous SVG on error
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    render();

    return () => {
      isMounted = false;
      delete window[`handleMermaidClick_${uniqueId.replace(/:/g, '-')}`];
    };
  }, [diagram, interactive, fileInfo, onNodeClick, uniqueId, detailedViewActive, enhanceDiagramWithLLM]); // Add enhanceDiagramWithLLM

  const handleZoom = (delta: number) => setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta)));
  
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    if (diagramSvg) {
      const blob = new Blob([diagramSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'architecture-diagram'}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(diagram)
      .then(() => alert('Diagram code copied to clipboard!'))
      .catch(err => console.error('Failed to copy diagram code: ', err));
  };
  
  const handleToggleDetailedView = () => {
    if (isLLMServiceAvailable) {
        setDetailedViewActive(!detailedViewActive); // This will trigger re-render via useEffect
    }
  };

  return (
    <div className="flex flex-col items-center w-full bg-gray-50 p-4 rounded-lg shadow">
      {title && (
        <div className="w-full mb-3 text-center">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        </div>
      )}

      <div className="w-full mb-3 flex flex-wrap justify-between items-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <ControlButton onClick={() => handleZoom(0.1)} title="Zoom In"><ZoomIn /></ControlButton>
          <ControlButton onClick={() => handleZoom(-0.1)} title="Zoom Out"><ZoomOut /></ControlButton>
          <ControlButton onClick={() => setZoomLevel(1)} title="Reset Zoom"><RefreshCw /></ControlButton>
        </div>
        <div className="flex items-center gap-1">
          {useLLM && (
            <ControlButton
              onClick={handleToggleDetailedView}
              active={detailedViewActive}
              title={detailedViewActive ? "Disable AI Enhanced View" : "Enable AI Enhanced View"}
              disabled={!isLLMServiceAvailable || isLoading || isEnhancing}
            >
              <Brain /> {isEnhancing && <Loader2 className="animate-spin ml-1" />}
            </ControlButton>
          )}
          <ControlButton onClick={handleDownload} title="Download SVG"><Download /></ControlButton>
          <ControlButton onClick={handleCopy} title="Copy Diagram Code"><Copy /></ControlButton>
          <ControlButton onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
          </ControlButton>
        </div>
      </div>

      {useLLM && !isLLMServiceAvailable && (
        <div className="w-full mb-3 p-2.5 bg-yellow-100 border border-yellow-300 rounded-md flex items-center gap-2 text-yellow-700 text-xs">
          <AlertTriangle className="w-4 h-4" />
          LLM service is not available for AI enhancements. Displaying basic diagram.
        </div>
      )}

      <div
        ref={containerRef} // This ref is for fullscreen
        className="w-full h-full flex justify-center items-center bg-white rounded-md border border-gray-200 overflow-hidden shadow-inner"
        style={{ minHeight: '600px', maxHeight: isFullscreen ? '100vh' : '80vh' }} 
      >
        <div 
            ref={svgContainerRef} // This ref for the SVG itself to apply zoom
            className="w-full h-full transition-transform duration-200 ease-out flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
        >
            {isLoading || isEnhancing ? (
            <div className="flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
                <p>{isEnhancing ? 'Enhancing diagram with AI...' : 'Rendering diagram...'}</p>
            </div>
            ) : error ? (
            <div className="p-4 text-red-600 bg-red-50 rounded-md text-sm w-full max-w-lg text-center">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <strong>Error Rendering Diagram:</strong>
                <p className="mt-1 text-xs break-all">{error}</p>
                <p className="mt-2 text-xs">Try simplifying the diagram code or check console for details.</p>
            </div>
            ) : diagramSvg ? (
            <div 
                className="mermaid-diagram-wrapper w-full h-full" // Ensure this div takes up space for mermaid
                dangerouslySetInnerHTML={{ __html: diagramSvg }}
            />
            ) : (
                 <div className="text-gray-400">No diagram to display.</div>
            )}
        </div>
      </div>

      {selectedNodeInfo && showDetails && (
        <div className="w-full mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm text-xs">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">{selectedNodeInfo.name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <DetailItem label="Path" value={selectedNodeInfo.path} />
            <DetailItem label="Type" value={selectedNodeInfo.type || 'N/A'} />
            <DetailItem label="Size" value={`${selectedNodeInfo.size.toLocaleString()} bytes`} />
            <DetailItem label="Complexity" value={`${selectedNodeInfo.complexity || 'N/A'}%`} />
            {selectedNodeInfo.lastModified && <DetailItem label="Last Modified" value={new Date(selectedNodeInfo.lastModified).toLocaleDateString()} />}
            {selectedNodeInfo.commitCount !== undefined && <DetailItem label="Commit Count" value={selectedNodeInfo.commitCount.toString()} />}
          </div>
          {/* Add more details like dependencies, contributors, functions if needed */}
        </div>
      )}
    </div>
  );
};

const ControlButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {active?: boolean; children: React.ReactNode}> = 
({ children, active, ...props }) => (
    <button
        {...props}
        className={`p-1.5 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1
            ${active ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {React.Children.map(children, child => 
            React.isValidElement(child) ? React.cloneElement(child as React.ReactElement, { className: "w-4 h-4" }) : child
        )}
    </button>
);

const DetailItem: React.FC<{label:string; value:string | number}> = ({label, value}) => (
    <div>
        <p className="text-gray-500">{label}</p>
        <p className="font-medium text-gray-700 truncate" title={String(value)}>{value}</p>
    </div>
);

export default ArchitectureDiagram;
