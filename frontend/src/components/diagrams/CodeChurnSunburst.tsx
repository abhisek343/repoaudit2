import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Sun } from 'lucide-react'; // For empty state, removed AlertTriangle
import ReactDOMServer from 'react-dom/server';

export interface ChurnNode { // Export for use in DiagramsPage
  name: string;
  path: string;
  churnRate: number; // Represents commit count or a derived churn metric
  children?: ChurnNode[];
  type: 'directory' | 'file';
}

interface CodeChurnSunburstProps {
  data?: ChurnNode; // Make data optional
  width?: number;
  height?: number;
  maxDepth?: number;
  onNodeClick?: (node: ChurnNode) => void;
}

const validateNode = (node: Partial<ChurnNode>): ChurnNode => ({
  name: node.name || 'unnamed',
  path: node.path || '',
  churnRate: isFinite(node.churnRate ?? 0) ? Math.max(0, node.churnRate!) : 0, // Allow larger churn rates
  type: node.type || (node.children ? 'directory' : 'file'), // Infer type if not provided
  children: node.children,
});

const CodeChurnSunburst: React.FC<CodeChurnSunburstProps> = ({ 
  data, 
  width = 600, 
  height = 600,
  maxDepth = 5, // Increased maxDepth
  onNodeClick 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<ChurnNode | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);

  const processedData = useMemo(() => {
    if (!data) return null;

    const validateAndLimitData = (node: ChurnNode, depth = 0): ChurnNode | null => {
      const validatedNode = validateNode(node);
      if (!validatedNode.name || validatedNode.name === 'unnamed') return null; // Skip nodes without names

      if (depth >= maxDepth) {
        return { ...validatedNode, children: undefined };
      }

      if (validatedNode.children && Array.isArray(validatedNode.children)) {
        validatedNode.children = validatedNode.children
          .map(child => validateAndLimitData(child, depth + 1))
          .filter(child => child !== null) as ChurnNode[]; // Filter out null children
        if (validatedNode.children.length === 0) validatedNode.children = undefined; // Remove empty children array
      }
      // If it's a directory with no children after filtering, and no churnRate itself, it's not very useful.
      if (validatedNode.type === 'directory' && !validatedNode.children && validatedNode.churnRate === 0) return null;

      return validatedNode;
    };
    return validateAndLimitData(data);
  }, [data, maxDepth]); // Removed maxChildrenPerLevel from dependencies

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!processedData) {
      const g = svg.attr("width", width).attr("height", height).append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);
      
      // Render Sun icon to string and append
      const sunIconSvgString = ReactDOMServer.renderToStaticMarkup(
        React.createElement(Sun, { className: "w-16 h-16 text-gray-400" })
      );
      g.append('g')
        .attr('transform', 'translate(-32, -50)') // Approximate centering for a 64x64 icon
        .html(sunIconSvgString);

      g.append("text").attr("text-anchor", "middle").attr("y", 20)
        .style("font-size", "14px").style("fill", "#6B7280")
        .text("No code churn data available to display.");
      return;
    }

    const radius = Math.min(width, height) / 2 - 20; // Increased padding
    
    // Create a hierarchical data structure
    const root = d3.hierarchy<ChurnNode>(processedData)
      .sum(d => d.type === 'file' ? Math.max(1, d.churnRate) : 0) // Files contribute their churn, directories sum up. Min value 1 for visibility.
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const partition = d3.partition<ChurnNode>().size([2 * Math.PI, radius]);
    const arcs = partition(root);

    // Dynamic color scale based on churn rate distribution
    const maxChurn = d3.max(arcs.descendants(), d => d.data.churnRate) || 1;
    const colorScale = d3.scaleSequentialSqrt(d3.interpolateYlOrRd) // Sqrt scale for better visual distinction
      .domain([0, maxChurn]);


    const arcGenerator = d3.arc<d3.HierarchyRectangularNode<ChurnNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005)) // Add padding
      .padRadius(radius / 2) // Add pad radius
      .innerRadius(d => d.y0 + 2) // Add some inner padding
      .outerRadius(d => Math.max(d.y0 + 2, d.y1 - 2)); // Ensure outer radius is greater


    const g = svg.attr("width", width).attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    g.selectAll<SVGPathElement, d3.HierarchyRectangularNode<ChurnNode>>("path")
      .data(arcs.descendants().filter(d => d.depth > 0)) // Exclude root node from drawing if it's just a container
      .join("path")
      .attr("d", arcGenerator) // Removed 'as any'
      .attr("fill", d => d.data.churnRate > 0 ? colorScale(d.data.churnRate) : '#E5E7EB') // gray-200 for zero churn
      .attr("fill-opacity", 0.8)
      .attr("stroke", "#FFF")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => { // d is d3.HierarchyRectangularNode<ChurnNode>
        d3.select(event.currentTarget).attr("fill-opacity", 1).attr("stroke-width", 1.5);
        setTooltipContent(`
          <div class="font-semibold text-sm">${d.data.name}</div>
          <div class="text-xs text-gray-300">${d.data.path}</div>
          <div class="text-xs mt-1">Churn Rate: <span class="font-medium">${d.data.churnRate.toFixed(0)}</span></div>
          ${d.value ? `<div class="text-xs">Value (sum): ${d.value.toFixed(0)}</div>` : ''}
        `);
        setTooltipPosition({ x: event.pageX, y: event.pageY });
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("fill-opacity", 0.8).attr("stroke-width", 0.5);
        setTooltipContent(null);
      })
      .on("click", (_event, d) => { // d is d3.HierarchyRectangularNode<ChurnNode>
        setSelectedNode(d.data);
        onNodeClick?.(d.data);
        // Optional: Zoom to clicked segment - this is more complex D3 logic
      });

    // Add labels
    g.selectAll<SVGTextElement, d3.HierarchyRectangularNode<ChurnNode>>("text")
      .data(arcs.descendants().filter(d => d.depth > 0 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.01 * Math.PI * radius)) // Filter for visibility
      .join("text")
      .attr("transform", d => {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        const rotate = x - 90;
        const flip = rotate > 90 && rotate < 270; // Flip text if it's upside down
        return `rotate(${rotate}) translate(${y},0) rotate(${flip ? 180 : 0})`;
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", d => ((d.x0 + d.x1) / 2 * 180 / Math.PI - 90 > 90 && (d.x0 + d.x1) / 2 * 180 / Math.PI - 90 < 270) ? "end" : "start")
      .style("font-size", "9px") // Smaller font
      .style("fill", "#374151") // gray-700
      .style("pointer-events", "none")
      .attr("dx", d => ((d.x0 + d.x1) / 2 * 180 / Math.PI - 90 > 90 && (d.x0 + d.x1) / 2 * 180 / Math.PI - 90 < 270) ? -4 : 4)
      .text(d => d.data.name.length > 15 ? d.data.name.substring(0,12) + "..." : d.data.name);

  }, [processedData, width, height, onNodeClick]);

  return (
    <div className="relative p-4 bg-white rounded-lg shadow border border-gray-200">
      <svg ref={svgRef} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`} />
      {tooltipContent && tooltipPosition && (
        <div
          className="absolute p-2 bg-gray-800 text-white rounded-md shadow-lg text-xs pointer-events-none"
          style={{ left: tooltipPosition.x + 10, top: tooltipPosition.y - 20, opacity: 0.95, zIndex: 1000 }}
          dangerouslySetInnerHTML={{ __html: tooltipContent }}
        />
      )}
      {selectedNode && (
        <div className="mt-3 p-3 bg-gray-100 rounded-md text-xs border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-1">Selected: {selectedNode.name}</h4>
          <p className="text-gray-600">Path: {selectedNode.path}</p>
          <p className="text-gray-600">Churn Rate: <span className="font-medium">{selectedNode.churnRate.toFixed(0)}</span></p>
        </div>
      )}
       <div className="mt-3 text-xs text-gray-500 text-center max-w-md mx-auto">
        <p>Sunburst chart visualizing code churn. Segment size can represent total churn, color intensity indicates churn rate. Hover for details, click to select.</p>
      </div>
    </div>
  );
};

export default CodeChurnSunburst;
