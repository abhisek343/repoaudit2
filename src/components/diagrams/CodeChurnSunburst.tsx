import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';

interface ChurnNode {
  name: string;
  path: string;
  churnRate: number;
  children?: ChurnNode[];
  type: 'directory' | 'file';
}

interface CodeChurnSunburstProps {
  data: ChurnNode;
  width?: number;
  height?: number;
  maxDepth?: number;
  maxChildrenPerLevel?: number;
  onNodeClick?: (node: ChurnNode) => void;
}

// Helper function to validate and clean node data
const validateNode = (node: Partial<ChurnNode>): ChurnNode => ({
  name: node.name || 'unnamed',
  path: node.path || '',
  churnRate: isFinite(node.churnRate ?? 0) ? Math.max(0, Math.min(100, node.churnRate!)) : 0,
  type: node.type || 'file',
  children: node.children,
});

const CodeChurnSunburst: React.FC<CodeChurnSunburstProps> = ({ 
  data, 
  width = 600, 
  height = 600,
  maxDepth = 4,
  maxChildrenPerLevel = 20,
  onNodeClick 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<ChurnNode | null>(null);

  // Memoize data processing
  const processedData = useMemo(() => {
    const validateAndLimitData = (
      node: ChurnNode, 
      depth = 0
    ): ChurnNode => {
      const validatedNode = validateNode(node);

      if (depth >= maxDepth) {
        return { ...validatedNode, children: undefined };
      }

      if (validatedNode.children && Array.isArray(validatedNode.children)) {
        validatedNode.children = validatedNode.children
          .slice(0, maxChildrenPerLevel)
          .map(child => validateAndLimitData(child, depth + 1))
          .filter(child => child.name.length > 0);
      }

      return validatedNode;
    };

    return validateAndLimitData(data);
  }, [data, maxDepth, maxChildrenPerLevel]);

  useEffect(() => {
    if (!svgRef.current || !processedData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const radius = Math.min(width, height) / 2 - 10;
    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, 100]);

    // Create the partition layout
    const root = d3.hierarchy<ChurnNode>(processedData)
      .sum(d => d.churnRate);

    const partition = d3.partition<ChurnNode>()
      .size([2 * Math.PI, radius]);

    const arcGenerator = d3.arc<d3.HierarchyRectangularNode<ChurnNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    const nodes = partition(root);
    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Draw arcs
    g.selectAll<SVGPathElement, d3.HierarchyRectangularNode<ChurnNode>>("path")
      .data(nodes.descendants())
      .enter()
      .append("path")
      .attr("d", d => arcGenerator(d) || "")
      .attr("fill", d => colorScale(d.data.churnRate))
      .attr("opacity", 0.8)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("opacity", 1);

        const tooltip = d3.select("#churn-tooltip");
        tooltip
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`
            <div class="p-2 bg-white rounded shadow-lg">
              <p class="font-medium">${d.data.name}</p>
              <p class="text-sm text-gray-600">${d.data.path}</p>
              <p class="text-sm mt-1">Churn Rate: <span class="font-medium">${d.data.churnRate.toFixed(1)}%</span></p>
            </div>
          `);
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("opacity", 0.8);

        d3.select("#churn-tooltip")
          .style("visibility", "hidden");
      })
      .on("click", (_event, d) => {
        setSelectedNode(d.data);
        onNodeClick?.(d.data);
      });

    // Add labels for larger segments
    g.selectAll<SVGTextElement, d3.HierarchyRectangularNode<ChurnNode>>("text")
      .data(nodes.descendants().filter(d => (d.x1 - d.x0) > 0.2))
      .enter()
      .append("text")
      .attr("transform", d => {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .text(d => d.data.name.slice(0, 20));

  }, [processedData, width, height, onNodeClick]);

  return (
    <div className="relative">
      <div className="bg-white rounded-xl p-4 shadow-lg">
        <svg ref={svgRef} width={width} height={height} className="w-full h-full" />
        <div 
          id="churn-tooltip" 
          style={{ 
            position: 'absolute',
            visibility: 'hidden',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        />
        {selectedNode && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900">Selected: {selectedNode.name}</h4>
            <p className="text-sm text-gray-600 mt-1">{selectedNode.path}</p>
            <p className="text-sm mt-2">
              Churn Rate: <span className="font-medium">{selectedNode.churnRate.toFixed(1)}%</span>
            </p>
          </div>
        )}
        <p className="text-sm text-gray-600 text-center mt-4">
          Click on segments to explore. Color intensity indicates churn rate.
        </p>
      </div>
    </div>
  );
};

export type { ChurnNode, CodeChurnSunburstProps };
export default CodeChurnSunburst;