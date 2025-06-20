// frontend/src/components/diagrams/TemporalCouplingGraph.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TemporalCoupling } from '../../types/advanced';
import ErrorDisplay from '../ui/ErrorDisplay';
import VisualizationErrorBoundary from '../VisualizationErrorBoundary';

interface Props {
  data: TemporalCoupling[];
  width?: number;  // optional fixed width for the graph
  height?: number; // optional fixed height for the graph
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  connections: number;
  group: number;
  fileName: string;
  radius: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: Node;
  target: Node;
  weight: number;
  strength: number;
}

const TemporalCouplingGraph: React.FC<Props> = ({ data, width: propWidth, height: propHeight }) => {
   const ref = useRef<SVGSVGElement>(null);
   const [selectedNode, setSelectedNode] = useState<string | null>(null);
   const [filterThreshold, setFilterThreshold] = useState<number>(1);
   const [showLabels, setShowLabels] = useState<boolean>(true);
   const [showStats, setShowStats] = useState<boolean>(false);

   useEffect(() => {
     console.log('[TemporalCouplingGraph] Received data:', data);
     if (!data || data.length === 0 || !ref.current) return;

     // Filter data based on threshold
     const filteredData = data.filter(d => d.weight >= filterThreshold);
     console.log(`[TemporalCouplingGraph] Filtering ${data.length} links to ${filteredData.length} with threshold ${filterThreshold}`);

     if (filteredData.length === 0) {
       console.log('[TemporalCouplingGraph] No data after filtering');
       return;
     }

     // Determine dimensions: use props if provided, else measure container
     const container = ref.current.parentElement;
     const width = propWidth ?? container?.clientWidth ?? 800;
     const height = propHeight ?? container?.clientHeight ?? 600;
     const svg = d3.select(ref.current)
       .attr('width', width)
       .attr('height', height);
     svg.selectAll("*").remove(); // Clear previous render

     // Process data to create enhanced nodes and links
     const nodeMap = new Map<string, Node>();

    // Create nodes with connection counts from filtered data
    filteredData.forEach(d => {
      if (!nodeMap.has(d.source)) {
        const fileName = d.source.split('/').pop() || d.source;
        nodeMap.set(d.source, {
          id: d.source,
          connections: 0,
          group: 0,
          fileName,
          radius: 0
        });
      }
      if (!nodeMap.has(d.target)) {
        const fileName = d.target.split('/').pop() || d.target;
        nodeMap.set(d.target, {
          id: d.target,
          connections: 0,
          group: 0,
          fileName,
          radius: 0
        });
      }
      
      nodeMap.get(d.source)!.connections += d.weight;
      nodeMap.get(d.target)!.connections += d.weight;
    });const nodes = Array.from(nodeMap.values());
    const maxConnections = Math.max(...nodes.map(n => n.connections));
    
    console.log(`[TemporalCouplingGraph] Processing ${nodes.length} nodes and ${data.length} links`);
    console.log(`[TemporalCouplingGraph] Max connections: ${maxConnections}`);

    // Set node radius based on connection strength
    nodes.forEach(node => {
      node.radius = Math.max(8, Math.min(25, 8 + (node.connections / maxConnections) * 17));
    });    // Create enhanced links from filtered data
    const links: Link[] = filteredData.map(d => {
      const source = nodeMap.get(d.source)!;
      const target = nodeMap.get(d.target)!;
      return {
        source,
        target,
        weight: d.weight,
        strength: Math.min(1, d.weight / 20) // Normalize strength based on typical weights
      };
    });

    // Group nodes using community detection based on coupling strength
    const groups = detectCommunities(nodes, links);
    nodes.forEach((node, i) => {
      node.group = groups[i];
    });

    // Color scale for groups
    const colorScale = d3.scaleOrdinal(d3.schemeSet3);

    // Add background click handler to clear selection
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "transparent")
      .style("pointer-events", "all")
      .on("click", () => setSelectedNode(null));    // Create legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(20, ${height - 120})`); // Position at bottom-left

    legend.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#374151")
      .text("Temporal Coupling Graph");

    legend.append("text")
      .attr("x", 0)
      .attr("y", 20)
      .style("font-size", "12px")
      .style("fill", "#6b7280")
      .text("Files frequently changed together");

    // Add legend items for link colors
    const legendItems = [
      { color: "#ef4444", label: "High coupling (>5)", threshold: 5 },
      { color: "#f59e0b", label: "Medium coupling (3-5)", threshold: 3 },
      { color: "#6b7280", label: "Low coupling (<3)", threshold: 0 }
    ];

    legendItems.forEach((item, i) => {
      const y = 40 + i * 20;
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", y)
        .attr("x2", 20)
        .attr("y2", y)
        .attr("stroke", item.color)
        .attr("stroke-width", 3);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", y + 4)
        .style("font-size", "11px")
        .style("fill", "#374151")
        .text(item.label);
    });// Weight scale for link thickness - adjusted for new weight ranges
    const weightScale = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.weight) as [number, number])
      .range([1, 8]);

    // Create force simulation with better forces
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
        .id((d: d3.SimulationNodeDatum) => (d as Node).id)
        .distance(d => Math.max(60, 120 - (d as Link).weight * 5))
        .strength(d => (d as Link).strength * 0.7)
      )
      // soften repulsion to prevent nodes flying off
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2))
      // gently pull nodes toward center
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .force("collision", d3.forceCollide()
        .radius(d => (d as Node).radius + 5)
      );    // Create link group
    const linkGroup = svg.append("g")
      .attr("class", "links");

    // Create links with enhanced styling
    const link = linkGroup.selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", d => d.weight > 5 ? "#ef4444" : d.weight > 3 ? "#f59e0b" : "#6b7280")
      .attr("stroke-opacity", d => Math.max(0.3, Math.min(0.9, d.weight / 10)))
      .attr("stroke-width", d => weightScale(d.weight))
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke-opacity", 1)
          .attr("stroke-width", weightScale(d.weight) + 2);
        
        // Show tooltip
        showTooltip(event, `${d.source.fileName} ↔ ${d.target.fileName}<br/>Co-changed ${d.weight} times`);
      })
      .on("mouseout", function(_event, d) {
        d3.select(this)
          .attr("stroke-opacity", Math.max(0.3, Math.min(0.9, d.weight / 10)))
          .attr("stroke-width", weightScale(d.weight));
        hideTooltip();
      });

    // Create node group
    const nodeGroup = svg.append("g")
      .attr("class", "nodes");

    // Create nodes with enhanced styling
    const node = nodeGroup.selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(drag(simulation) as any);

    // Add outer ring for highly coupled files
    node.filter(d => d.connections > maxConnections * 0.7)
      .append("circle")
      .attr("r", d => d.radius + 4)
      .attr("fill", "none")
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3,3");

    // Main node circles
    node.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => colorScale(d.group.toString()))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("filter", d => d.connections > maxConnections * 0.5 ? "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))" : "none");

    // Add file type icons or abbreviations
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", d => `${Math.max(8, d.radius * 0.6)}px`)
      .style("font-weight", "bold")
      .style("fill", "#fff")
      .style("pointer-events", "none")
      .text(d => getFileTypeAbbreviation(d.fileName));    // Add file name labels for important nodes (controlled by showLabels)
    if (showLabels) {
      node.filter(d => d.connections > maxConnections * 0.3)
        .append("text")
        .attr("x", 0)
        .attr("y", d => d.radius + 15)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#374151")
        .style("font-weight", "500")
        .style("pointer-events", "none")
        .text(d => d.fileName.length > 15 ? d.fileName.substring(0, 12) + "..." : d.fileName);
    }

    // Node interaction handlers
    node      .on("mouseover", function(event, d) {
        
        // Highlight connected nodes and links
        node.style("opacity", n => 
          n.id === d.id || isConnected(d, n) ? 1 : 0.3
        );
        
        link.style("opacity", l => 
          l.source.id === d.id || l.target.id === d.id ? 1 : 0.1
        );

        // Show enhanced tooltip
        const connectedFiles = getConnectedFiles(d, links);
        showTooltip(event, 
          `<strong>${d.fileName}</strong><br/>
           Connections: ${d.connections}<br/>
           Coupled with: ${connectedFiles.slice(0, 3).join(", ")}
           ${connectedFiles.length > 3 ? `<br/>and ${connectedFiles.length - 3} more...` : ""}`
        );
      })      .on("mouseout", function() {
        
        // Reset opacity
        node.style("opacity", 1);
        link.style("opacity", d => Math.max(0.3, Math.min(0.9, d.weight / 10)));
        
        hideTooltip();
      })      .on("click", function(_event, d) {
        setSelectedNode(selectedNode === d.id ? null : d.id);
      });

    // Simulation tick handler
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x!)
        .attr("y1", d => d.source.y!)
        .attr("x2", d => d.target.x!)
        .attr("y2", d => d.target.y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Helper functions
    function isConnected(nodeA: Node, nodeB: Node): boolean {
      return links.some(link => 
        (link.source.id === nodeA.id && link.target.id === nodeB.id) ||
        (link.source.id === nodeB.id && link.target.id === nodeA.id)
      );
    }

    function getConnectedFiles(node: Node, links: Link[]): string[] {
      return links
        .filter(link => link.source.id === node.id || link.target.id === node.id)
        .map(link => link.source.id === node.id ? link.target.fileName : link.source.fileName)
        .sort();
    }

    function getFileTypeAbbreviation(fileName: string): string {
      const ext = fileName.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'ts': case 'tsx': return 'TS';
        case 'js': case 'jsx': return 'JS';
        case 'css': case 'scss': return 'CSS';
        case 'html': return 'HTML';
        case 'json': return 'JSON';
        case 'md': return 'MD';
        case 'py': return 'PY';
        case 'java': return 'JAVA';
        case 'cpp': case 'c': return 'C++';
        default: return fileName.substring(0, 2).toUpperCase();
      }
    }    // Tooltip functions
    function showTooltip(event: MouseEvent, content: string) {
      // Remove any existing tooltip
      d3.select(".temporal-tooltip").remove();

      const tooltip = d3.select("body")
        .append("div")
        .attr("class", "temporal-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.9)")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("line-height", "1.4")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("opacity", 0)
        .html(content);

      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .transition()
        .duration(200)
        .style("opacity", 1);
    }

    function hideTooltip() {
      d3.select(".temporal-tooltip")
        .transition()
        .duration(200)
        .style("opacity", 0)
        .remove();
    }

    function drag(simulation: d3.Simulation<Node, Link>) {
      function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      return d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // Simple community detection algorithm
    function detectCommunities(nodes: Node[], links: Link[]): number[] {
      const groups: number[] = new Array(nodes.length).fill(0);
      const nodeToIndex = new Map(nodes.map((node, i) => [node.id, i]));
      
      let groupId = 0;
      const visited = new Set<number>();      nodes.forEach((_node, i) => {
        if (!visited.has(i)) {
          const component = getConnectedComponent(i, nodeToIndex, links, visited);
          component.forEach(nodeIndex => {
            groups[nodeIndex] = groupId;
          });
          groupId++;
        }
      });

      return groups;
    }

    function getConnectedComponent(
      startIndex: number, 
      nodeToIndex: Map<string, number>, 
      links: Link[], 
      visited: Set<number>
    ): number[] {
      const component: number[] = [];
      const stack = [startIndex];
      
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        
        visited.add(current);
        component.push(current);
        
        // Find connected nodes
        links.forEach(link => {
          const sourceIndex = nodeToIndex.get(link.source.id);
          const targetIndex = nodeToIndex.get(link.target.id);
          
          if (sourceIndex === current && targetIndex !== undefined && !visited.has(targetIndex)) {
            stack.push(targetIndex);
          } else if (targetIndex === current && sourceIndex !== undefined && !visited.has(sourceIndex)) {
            stack.push(sourceIndex);
          }
        });
      }
      
      return component;
    }  }, [data, selectedNode, filterThreshold, showLabels, propWidth, propHeight]);

   if (!data || data.length === 0) {
     return <ErrorDisplay message="No Temporal Coupling Data" />;
   }

  // Calculate stats for display
  const maxWeight = Math.max(...data.map(d => d.weight));
  const avgWeight = data.reduce((sum, d) => sum + d.weight, 0) / data.length;
  const uniqueFiles = new Set([...data.map(d => d.source), ...data.map(d => d.target)]).size;
  const filteredCount = data.filter(d => d.weight >= filterThreshold).length;

  return (
    <VisualizationErrorBoundary fallbackMessage="Could not render the Temporal Coupling Graph.">
      <div
        className="relative w-full h-full"
        style={{
          width: propWidth ? `${propWidth}px` : '100%',
          height: propHeight ? `${propHeight}px` : '100%' // fill parent height if not specified
        }}
      >
         {/* Controls Panel */}
         <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-10 max-w-xs">
           <h4 className="font-semibold text-sm mb-3">Temporal Coupling Controls</h4>
          
          {/* Filter Threshold */}
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">
              Min Coupling Weight: {filterThreshold}
            </label>
            <input
              type="range"
              min="1"
              max={Math.max(10, maxWeight)}
              value={filterThreshold}
              onChange={(e) => setFilterThreshold(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-xs text-gray-500 mt-1">
              Showing {filteredCount} of {data.length} links
            </div>
          </div>

          {/* Toggle Controls */}
          <div className="space-y-2">
            <label className="flex items-center text-xs">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="mr-2"
              />
              Show file labels
            </label>
            <label className="flex items-center text-xs">
              <input
                type="checkbox"
                checked={showStats}
                onChange={(e) => setShowStats(e.target.checked)}
                className="mr-2"
              />
              Show statistics
            </label>
          </div>

          {/* Statistics */}
          {showStats && (
            <div className="mt-3 pt-3 border-t text-xs text-gray-600">
              <div>Files: {uniqueFiles}</div>
              <div>Max Weight: {maxWeight.toFixed(1)}</div>
              <div>Avg Weight: {avgWeight.toFixed(1)}</div>
            </div>
          )}
         </div>

        <svg ref={ref} style={{ width: '100%', height: '100%' }}></svg>
        
        {selectedNode && (
          <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs z-10">
            <h4 className="font-semibold text-sm mb-2">Selected File</h4>
            <p className="text-xs text-gray-600 break-all">{selectedNode}</p>
            <div className="text-xs text-gray-500 mt-2">
              Click the graph background to clear selection
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="mt-2 px-2 py-1 bg-gray-100 text-xs rounded hover:bg-gray-200"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>
    </VisualizationErrorBoundary>
  );
};

export default TemporalCouplingGraph;
