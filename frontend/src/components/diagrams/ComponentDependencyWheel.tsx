import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { AnalysisResult } from '../../types';

export interface DependencyData {
  source: string;
  target: string;
  value: number;
}

interface ComponentDependencyWheelProps {
  reportData?: AnalysisResult;
  dependencies?: DependencyData[];
  width?: number;
  height?: number;
  showInternal?: boolean; // Initial state for toggle
}

const ComponentDependencyWheel = ({ 
  reportData,
  dependencies, 
  width = 800, 
  height = 800,
  showInternal: initialShowInternal = true
}: ComponentDependencyWheelProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // State for toggling between internal and external dependencies
  const [showInternal, setShowInternal] = useState(initialShowInternal);
  // Extract dependencies from reportData based on mode
  const extractedDependencies = useMemo(() => {
    if (dependencies) return dependencies; // Use provided dependencies if available
    
    if (!reportData) return [];

    if (showInternal) {
      // Use internal module dependencies from dependencyGraph
      if (reportData.dependencyGraph?.links) {
        return reportData.dependencyGraph.links.map(link => ({
          source: String(link.source),
          target: String(link.target),
          value: 1 // Internal dependencies typically have value 1
        }));
      }
    } else {
      // Use external package dependencies
      if (reportData.dependencyWheelData) {
        return reportData.dependencyWheelData;
      }
      
      // Fallback: Use package dependency graph
      if (reportData.dependencyMetrics?.packageDependencyGraph?.links) {
        return (reportData.dependencyMetrics.packageDependencyGraph.links as Array<{
          source: string; 
          target: string; 
          value?: number;
        }>).map(link => ({
          source: link.source,
          target: link.target,
          value: link.value || 1
        }));
      }
    }
    
    return [];
  }, [reportData, dependencies, showInternal]);
  // Memoize processed data
  const processedData = useMemo(() => {
    const deps = extractedDependencies;
    if (!deps || deps.length === 0) return null;

    // Get all unique nodes
    const allNodeNames = Array.from(new Set([
      ...deps.map(d => d.source),
      ...deps.map(d => d.target)
    ]));

    // Limit nodes for performance and visual clarity
    const MAX_NODES = showInternal ? 25 : 15; // More nodes for internal deps
    
    // Calculate node importance by total connection value
    const nodeImportance = new Map<string, number>();
    deps.forEach(d => {
      nodeImportance.set(d.source, (nodeImportance.get(d.source) || 0) + d.value);
      nodeImportance.set(d.target, (nodeImportance.get(d.target) || 0) + d.value);
    });

    // Select top nodes by importance
    const selectedNodes = allNodeNames
      .sort((a, b) => (nodeImportance.get(b) || 0) - (nodeImportance.get(a) || 0))
      .slice(0, MAX_NODES);

    // Filter dependencies to only include selected nodes
    const filteredDeps = deps.filter(d => 
      selectedNodes.includes(d.source) && selectedNodes.includes(d.target)
    );

    if (selectedNodes.length < 2 || filteredDeps.length === 0) return null;

    // Create adjacency matrix
    const nodeIndex = new Map(selectedNodes.map((name, i) => [name, i]));
    const matrix: number[][] = selectedNodes.map(() => selectedNodes.map(() => 0));
    
    filteredDeps.forEach(d => {
      const sourceIdx = nodeIndex.get(d.source)!;
      const targetIdx = nodeIndex.get(d.target)!;
      matrix[sourceIdx][targetIdx] += d.value;
    });

    return { 
      nodes: selectedNodes, 
      matrix, 
      filteredDeps,
      totalNodes: allNodeNames.length,
      totalDeps: deps.length 
    };
  }, [extractedDependencies, showInternal]);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();    if (!processedData) {
      // Enhanced empty state with helpful information
      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);
      
      // Main message
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-20")
        .style("font-size", "18px")
        .style("font-weight", "600")
        .style("fill", "#374151")
        .text("No Dependency Data Available");
      
      // Subtitle with mode info
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "5")
        .style("font-size", "14px")
        .style("fill", "#6B7280")
        .text(`Currently showing: ${showInternal ? 'Internal Module' : 'External Package'} dependencies`);
      
      // Stats if available
      if (reportData) {
        const fileCount = reportData.files?.length || 0;
        const totalDeps = reportData.dependencyMetrics?.totalDependencies || 0;
        
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "35")
          .style("font-size", "12px")
          .style("fill", "#9CA3AF")
          .text(`Project has ${fileCount} files and ${totalDeps} external dependencies`);
      }
      
      return;
    }

    const { nodes, matrix } = processedData;
    const radius = Math.min(width, height) / 2 - 60;
    const innerRadius = radius - 60;

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Chord layout
    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending);

    const chords = chord(matrix);    // Arc generator
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(innerRadius + 20);

    // Main container
    svg.attr("width", width).attr("height", height);
    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", `translate(${width / 2}, ${height / 2}) ${event.transform}`);
      });

    svg.call(zoom);

    // Draw groups (outer arcs)
    const groups = g.append("g")
      .selectAll("g")
      .data(chords.groups)
      .join("g");

    groups.append("path")
      .attr("d", d => arc({
        startAngle: d.startAngle,
        endAngle: d.endAngle,
        innerRadius: innerRadius,
        outerRadius: innerRadius + 20
      }) || "")
      .attr("fill", d => colorScale(nodes[d.index]))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(_, d) {
        // Highlight related ribbons
        g.selectAll(".ribbon")
          .style("opacity", function() {
            const r = d3.select(this).datum() as d3.Chord;
            return r.source.index === d.index || r.target.index === d.index ? 0.9 : 0.1;
          });
        
        // Highlight this group
        d3.select(this).style("opacity", 0.8);
      })
      .on("mouseout", function() {
        g.selectAll(".ribbon").style("opacity", 0.7);
        d3.select(this).style("opacity", 1);
      });    // Add labels with smarter naming
    groups.append("text")
      .attr("transform", d => {
        const angle = (d.startAngle + d.endAngle) / 2;
        const isFlipped = angle > Math.PI;
        const rotation = (angle * 180 / Math.PI) - 90;
        const textRadius = innerRadius + 35;
        
        return `rotate(${rotation}) translate(${textRadius}, 0) ${isFlipped ? 'rotate(180)' : ''}`;
      })
      .attr("text-anchor", d => {
        const angle = (d.startAngle + d.endAngle) / 2;
        return angle > Math.PI ? "end" : "start";
      })
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .style("font-weight", "500")
      .style("fill", "#374151")
      .text(d => {
        const nodeName = nodes[d.index];
        // Smarter labeling based on dependency type
        if (showInternal) {
          // For internal dependencies, show just the filename or last part of path
          return nodeName.split('/').pop() || nodeName;
        } else {
          // For external dependencies, show package name (remove version info)
          return nodeName.split('@')[0];
        }
      });

    // Draw ribbons (connections)
    g.append("g")
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("class", "ribbon")      .attr("d", d => {
        // Manually create path for ribbon using control points
        const sourceAngle = (d.source.startAngle + d.source.endAngle) / 2;
        const targetAngle = (d.target.startAngle + d.target.endAngle) / 2;
        
        const sourceX = Math.cos(sourceAngle - Math.PI / 2) * innerRadius;
        const sourceY = Math.sin(sourceAngle - Math.PI / 2) * innerRadius;
        const targetX = Math.cos(targetAngle - Math.PI / 2) * innerRadius;
        const targetY = Math.sin(targetAngle - Math.PI / 2) * innerRadius;
        
        return `M ${sourceX} ${sourceY} Q 0 0 ${targetX} ${targetY}`;
      })
      .attr("fill", d => colorScale(nodes[d.source.index]))
      .attr("stroke", d => d3.rgb(colorScale(nodes[d.source.index])).darker().toString())
      .style("opacity", 0.7)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        // Highlight related ribbons
        g.selectAll(".ribbon")
          .style("opacity", function() {
            const r = d3.select(this).datum() as d3.Chord;
            return r.source.index === d.source.index || r.target.index === d.target.index ? 0.9 : 0.1;
          });
        
        // Highlight this ribbon
        d3.select(this).style("opacity", 0.8);
        
        // Simple tooltip without complex merging
        d3.select("body").selectAll(".chord-tooltip").remove();
        d3.select("body").append("div")
          .attr("class", "chord-tooltip")
          .style("position", "absolute")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .style("background", "rgba(0,0,0,0.8)")
          .style("color", "white")
          .style("padding", "8px 12px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .html(`
            <strong>${nodes[d.source.index]}</strong> → <strong>${nodes[d.target.index]}</strong><br/>
            ${matrix[d.source.index][d.target.index]} connections
          `);
      })
      .on("mouseout", function() {
        g.selectAll(".ribbon").style("opacity", 0.7);
        d3.select("body").selectAll(".chord-tooltip").remove();
      });

  }, [processedData, width, height, reportData, showInternal]);
  // Create legend data with enhanced information
  const legendData = useMemo(() => {
    if (!processedData) return [];
    return processedData.nodes.map((name) => {
      // Create cleaner display names
      const displayName = showInternal 
        ? name.split('/').pop() || name  // Show just filename for internal
        : name; // Show full package name for external
        
      return {
        name: displayName,
        fullName: name,
        color: d3.scaleOrdinal(d3.schemeCategory10)(name)
      };
    });
  }, [processedData, showInternal]);
  return (
    <div className="flex flex-col items-center p-6 bg-gradient-to-br from-gray-50 to-white rounded-lg shadow-lg border border-gray-200">
      <div className="mb-4 w-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Module Dependency Wheel</h3>
          
          {/* Toggle between internal and external dependencies */}
          {reportData && (
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${!showInternal ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                External
              </span>              <button
                onClick={() => setShowInternal(!showInternal)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  showInternal ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    showInternal ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${showInternal ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                Internal
              </span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {showInternal ? 'Internal module relationships' : 'External package dependencies'} visualization
          </p>
          
          {processedData && (
            <p className="text-xs text-gray-500">
              Showing {processedData.nodes.length} of {processedData.totalNodes} nodes 
              ({processedData.filteredDeps.length} of {processedData.totalDeps} connections)
            </p>
          )}
        </div>
      </div>
      
      <svg 
        ref={svgRef} 
        className="w-full h-auto border border-gray-300 rounded shadow-inner"
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxHeight: '700px' }}
      />
      
      {legendData.length > 0 && (
        <div className="mt-6 w-full">
          <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">
            {showInternal ? 'Module' : 'Package'} Legend
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-w-5xl">
            {legendData.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center space-x-2 text-xs bg-white px-2 py-1 rounded border"
                title={item.fullName} // Show full name on hover
              >
                <div 
                  className="w-3 h-3 rounded-full border border-gray-300 shadow-sm" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-700 truncate font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500 text-center max-w-md bg-gray-50 p-3 rounded">
        <p className="font-medium">🎯 Interactive Features:</p>
        <p className="mt-1">
          • Hover modules/connections to highlight relationships<br/>
          • Zoom with mouse wheel • Pan by dragging<br/>
          • Chord thickness indicates connection strength<br/>
          • Toggle between internal modules and external packages
        </p>
      </div>
    </div>
  );
};

export default ComponentDependencyWheel;
