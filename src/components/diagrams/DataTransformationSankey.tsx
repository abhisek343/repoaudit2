import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

interface SankeyNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  category: string;
  value?: number;
  x?: number;
  y?: number;
  sourceLinks?: SankeyLink[];
  targetLinks?: SankeyLink[];
}

interface SankeyLink extends d3.SimulationLinkDatum<SankeyNode> {
  source: string | SankeyNode;
  target: string | SankeyNode;
  value: number;
  path?: string;
  width?: number;
}

interface PositionedNode extends SankeyNode {
  x: number;
  y: number;
  height: number;
}

interface PositionedLink extends SankeyLink {
  source: PositionedNode;
  target: PositionedNode;
  path: string;
  width: number;
}

interface DataTransformationSankeyProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
  nodeWidth?: number;
  nodePadding?: number;
  colorScale?: d3.ScaleOrdinal<string, string>;
}

const DataTransformationSankey: React.FC<DataTransformationSankeyProps> = ({ 
  nodes, 
  links, 
  width = 800, 
  height = 400,
  nodeWidth = 20,
  nodePadding = 10,
  colorScale = d3.scaleOrdinal(d3.schemeCategory10)
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Memoize data processing
  const { validNodes, validLinks, categories } = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const categories = Array.from(new Set(nodes.map(n => n.category))).sort();
    
    // Filter out invalid links
    const validLinks = links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodeMap.has(sourceId) && nodeMap.has(targetId) && link.value > 0;
    });

    // Filter out orphaned nodes
    const connectedNodeIds = new Set([
      ...validLinks.map(l => typeof l.source === 'string' ? l.source : l.source.id),
      ...validLinks.map(l => typeof l.target === 'string' ? l.target : l.target.id)
    ]);

    const validNodes = nodes.filter(n => connectedNodeIds.has(n.id));

    return { validNodes, validLinks, categories };
  }, [nodes, links]);

  useEffect(() => {
    if (!svgRef.current || !validNodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const categoryWidth = innerWidth / categories.length;

    // Position nodes by category with better type safety
    const positionedNodes: PositionedNode[] = validNodes.map((node) => {
      const categoryIndex = categories.indexOf(node.category);
      const nodesInCategory = validNodes.filter(n => n.category === node.category);
      const nodeIndex = nodesInCategory.indexOf(node);
      const categoryHeight = innerHeight / Math.max(1, nodesInCategory.length);

      return {
        ...node,
        x: margin.left + categoryIndex * categoryWidth + nodeWidth,
        y: margin.top + nodeIndex * categoryHeight + nodePadding,
        height: categoryHeight - nodePadding * 2
      };
    });

    // Create the node rectangles
    const nodeGroup = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(positionedNodes)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodeGroup
      .append("rect")
      .attr("width", nodeWidth)
      .attr("height", d => d.height)
      .attr("fill", d => colorScale(d.category))
      .attr("opacity", 0.8)
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    // Add node labels
    nodeGroup
      .append("text")
      .attr("x", nodeWidth + 5)
      .attr("y", d => d.height / 2)
      .attr("dy", "0.35em")
      .text(d => d.name)
      .attr("font-size", "10px")
      .attr("fill", "#333");

    // Create links with proper typing
    const positionedLinks: PositionedLink[] = validLinks.map(link => {
      const source = positionedNodes.find(
        n => n.id === (typeof link.source === 'string' ? link.source : link.source.id)
      )!;
      const target = positionedNodes.find(
        n => n.id === (typeof link.target === 'string' ? link.target : link.target.id)
      )!;

      // Calculate link path
      const path = d3.path();
      const sourceX = source.x + nodeWidth;
      const targetX = target.x;
      const sourceY = source.y + source.height / 2;
      const targetY = target.y + target.height / 2;
      const width = Math.max(1, Math.min(10, Math.sqrt(link.value)));

      path.moveTo(sourceX, sourceY);
      path.bezierCurveTo(
        (sourceX + targetX) / 2, sourceY,
        (sourceX + targetX) / 2, targetY,
        targetX, targetY
      );

      return {
        ...link,
        source,
        target,
        path: path.toString(),
        width
      };
    });

    // Draw the links
    svg
      .append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(positionedLinks)
      .enter()
      .append("path")
      .attr("d", d => d.path)
      .attr("stroke", "#999")
      .attr("stroke-width", d => d.width)
      .attr("fill", "none")
      .attr("opacity", 0.4);

    // Add tooltips and interactivity
    nodeGroup
      .on("mouseover", function(_event, d) {
        d3.select(this)
          .select("rect")
          .transition()
          .duration(200)
          .attr("opacity", 1);

        // Highlight connected links
        svg.selectAll<SVGPathElement, PositionedLink>("path")
          .transition()
          .duration(200)
          .attr("opacity", function(this: SVGPathElement, link: PositionedLink) {
            return link.source.id === d.id || link.target.id === d.id ? 0.8 : 0.1;
          });
      })
      .on("mouseout", function() {
        d3.select(this)
          .select("rect")
          .transition()
          .duration(200)
          .attr("opacity", 0.8);

        svg.selectAll("path")
          .transition()
          .duration(200)
          .attr("opacity", 0.4);
      });

  }, [validNodes, validLinks, categories, width, height, nodeWidth, nodePadding, colorScale]);    return (
      <div className="relative">
        <div className="bg-white rounded-xl p-4 shadow-lg">
          <svg ref={svgRef} width={width} height={height} className="w-full h-full"></svg>
          <p className="text-sm text-gray-600 text-center max-w-md mt-4">
            Sankey diagram showing data flow between system components. 
            Width of connections represents data volume.
          </p>
        </div>
      </div>
    );
};

export type { SankeyNode, SankeyLink, DataTransformationSankeyProps };
export default DataTransformationSankey;