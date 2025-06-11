import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3'; // For scales, colors, etc.
import { sankey, sankeyLinkHorizontal, sankeyJustify, sankeyLeft } from 'd3-sankey';
import { Shuffle } from 'lucide-react'; // For empty state icons, removed ServerCrash

// Interface for nodes as expected by d3-sankey and for our use
export interface SankeyNode {
  id: string; // Unique identifier for the node
  name: string; // Display name for the node
  category: string; // Category for coloring or grouping
  // Properties that d3-sankey will populate:
  index?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
  depth?: number;
  layer?: number;
  sourceLinks?: SankeyLink[];
  targetLinks?: SankeyLink[];
}

// Interface for links as expected by d3-sankey
export interface SankeyLink {
  source: string | number | SankeyNode; // ID, index, or node object
  target: string | number | SankeyNode; // ID, index, or node object
  value: number; // The flow value of the link
  // Properties that d3-sankey will populate:
  index?: number;
  y0?: number;
  y1?: number;
  width?: number;
}

interface DataTransformationSankeyProps {
  nodes?: SankeyNode[];
  links?: SankeyLink[];
  width?: number;
  height?: number;
  nodeWidth?: number;
  nodePadding?: number;
  colorScale?: d3.ScaleOrdinal<string, string>;
}

const DataTransformationSankey: React.FC<DataTransformationSankeyProps> = ({ 
  nodes: initialNodes = [], 
  links: initialLinks = [], 
  width = 800, 
  height = 500,
  nodeWidth = 24,
  nodePadding = 15,
  colorScale = d3.scaleOrdinal(d3.schemeTableau10)
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);

  const processedGraph = useMemo(() => {
    if (!initialNodes || !initialNodes.length || !initialLinks || !initialLinks.length) {
      return null;
    }
    const nodesCopy = JSON.parse(JSON.stringify(initialNodes)) as SankeyNode[];
    const linksCopy = JSON.parse(JSON.stringify(initialLinks)) as SankeyLink[];

    const nodeMap = new Map(nodesCopy.map((node, i) => [node.id, i]));
    
    const validLinks = linksCopy.filter(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as SankeyNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as SankeyNode).id;
        return nodeMap.has(sourceId) && nodeMap.has(targetId) && link.value > 0;
    }).map(link => {
        const sourceNodeId = typeof link.source === 'string' ? link.source : (link.source as SankeyNode).id;
        const targetNodeId = typeof link.target === 'string' ? link.target : (link.target as SankeyNode).id;
        return {
            ...link,
            source: nodeMap.get(sourceNodeId)!, 
            target: nodeMap.get(targetNodeId)! 
        };
    });

    if (nodesCopy.length === 0 || validLinks.length === 0) return null;
    
    const layout = sankey<SankeyNode, SankeyLink>()
      .nodeId((d: SankeyNode) => d.id)
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .extent([[1, 1], [width - 1, height - 40]]) 
      .nodeAlign(sankeyJustify || sankeyLeft); 

    try {
        const graphInput = { nodes: nodesCopy, links: validLinks.map(l => ({...l})) };
        const graph = layout(graphInput);

        if (graph.nodes.some((n: SankeyNode) => n.x0 === undefined || n.y0 === undefined || isNaN(n.x0) || isNaN(n.y0))) {
            console.error("Sankey layout resulted in undefined or NaN coordinates.");
            return null;
        }
        return graph;
    } catch (error) {
        console.error("Error during Sankey layout:", error);
        return null;
    }
  }, [initialNodes, initialLinks, width, height, nodeWidth, nodePadding]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!processedGraph || !processedGraph.nodes || !processedGraph.nodes.length || !processedGraph.links || !processedGraph.links.length) {
      const g = svg.attr("width", width).attr("height", height).append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2 - 20})`);
      g.append(() => React.createElement(Shuffle, { className: "w-16 h-16 text-gray-400" }) as unknown as Element)
        .attr('x', -32).attr('y', -50);
      g.append("text").attr("text-anchor", "middle").attr("y", 20)
        .style("font-size", "14px").style("fill", "#6B7280")
        .text("Insufficient data for Sankey diagram.");
      return;
    }
    
    const { nodes: layoutNodes, links: layoutLinks } = processedGraph;
    const linkGen = sankeyLinkHorizontal();

    svg.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
      .selectAll<SVGPathElement, SankeyLink>("path")
      .data(layoutLinks)
      .join("path")
        .attr("d", linkGen) // Removed 'as any'
        .attr("stroke", (d: SankeyLink) => colorScale((d.source as SankeyNode).category))
        .attr("stroke-width", (d: SankeyLink) => Math.max(1, d.width!))
        .on("mouseover", (event: MouseEvent, d: SankeyLink) => {
          d3.select(event.currentTarget as SVGPathElement).attr("stroke-opacity", 0.8);
          setTooltipContent(`
            <div class="font-semibold text-sm">${(d.source as SankeyNode).name} → ${(d.target as SankeyNode).name}</div>
            <div class="text-xs text-gray-300">Value: ${d.value.toLocaleString()}</div>
          `);
          setTooltipPosition({ x: event.pageX, y: event.pageY });
        })
        .on("mouseout", (event: MouseEvent) => {
          d3.select(event.currentTarget as SVGPathElement).attr("stroke-opacity", 0.5);
          setTooltipContent(null);
        });

    const nodeGroup = svg.append("g")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .selectAll<SVGGElement, SankeyNode>("g")
      .data(layoutNodes)
      .join("g")
        .attr("transform", (d: SankeyNode) => `translate(${d.x0},${d.y0})`)
        .on("mouseover", (event: MouseEvent, d: SankeyNode) => {
          d3.select(event.currentTarget as SVGGElement).select("rect").attr("stroke-width", 1.5).attr("stroke", "#333");
          setTooltipContent(`
            <div class="font-semibold text-sm">${d.name}</div>
            <div class="text-xs text-gray-300">Category: ${d.category}</div>
            <div class="text-xs mt-1">Total Flow: ${d.value!.toLocaleString()}</div>
          `);
          setTooltipPosition({ x: event.pageX, y: event.pageY });
        })
        .on("mouseout", (event: MouseEvent) => {
          d3.select(event.currentTarget as SVGGElement).select("rect").attr("stroke-width", 0.5).attr("stroke", "#000");
          setTooltipContent(null);
        });

    nodeGroup.append("rect")
      .attr("height", (d: SankeyNode) => Math.max(1, d.y1! - d.y0!))
      .attr("width", (d: SankeyNode) => d.x1! - d.x0!)
      .attr("fill", (d: SankeyNode) => colorScale(d.category))
      .attr("fill-opacity", 0.9);

    nodeGroup.append("text")
      .attr("x", (d: SankeyNode) => (d.x0! < width / 2 && (d.x1! - d.x0!) > 10) ? (d.x1! - d.x0! + 6) : -6)
      .attr("y", (d: SankeyNode) => (d.y1! - d.y0!) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d: SankeyNode) => (d.x0! < width / 2 && (d.x1! - d.x0!) > 10) ? "start" : "end")
      .style("font-size", "10px")
      .style("fill", "#333")
      .style("pointer-events", "none")
      .text((d: SankeyNode) => d.name)
      .append("title")
        .text((d: SankeyNode) => `${d.name}\nCategory: ${d.category}\nValue: ${d.value!.toLocaleString()}`);
        
  }, [processedGraph, width, height, colorScale, nodeWidth, nodePadding]);
  
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
      <div className="mt-3 text-xs text-gray-500 text-center max-w-md mx-auto">
        <p>Sankey diagram illustrating data or process flow. Node height and link width represent flow volume. Hover for details.</p>
      </div>
    </div>
  );
};

export default DataTransformationSankey;
