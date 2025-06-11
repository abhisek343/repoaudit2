import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TrendingUp } from 'lucide-react'; // For empty state

export interface CouplingNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  path: string;
  group: number;
  // x, y, fx, fy will be added by D3 simulation
}

export interface CouplingLink extends d3.SimulationLinkDatum<CouplingNode> {
  source: CouplingNode; // D3 simulation works best with objects
  target: CouplingNode;
  strength: number;
}

export interface TemporalCouplingGraphProps {
  nodes: Array<Pick<CouplingNode, 'id' | 'name' | 'path' | 'group'>>;
  links: Array<{ source: string; target: string; strength: number }>;
  width?: number;
  height?: number;
}

const TemporalCouplingGraph: React.FC<TemporalCouplingGraphProps> = ({ 
  nodes: initialNodes = [], 
  links: initialLinks = [], 
  width = 800, 
  height = 600 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!initialNodes || initialNodes.length === 0) {
      const gEmpty = svg.attr("width", width).attr("height", height).append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);
      gEmpty.append(() => React.createElement(TrendingUp, { className: "w-16 h-16 text-gray-300" }) as unknown as Element)
        .attr('x', -32).attr('y', -50);
      gEmpty.append("text").attr("text-anchor", "middle").attr("y", 20)
        .style("font-size", "14px").style("fill", "#6B7280")
        .text("No temporal coupling data to display.");
      return;
    }
    
    const graphNodes: CouplingNode[] = JSON.parse(JSON.stringify(initialNodes)); // Deep copy
    const nodeMap = new Map(graphNodes.map(n => [n.id, n]));

    const graphLinks: CouplingLink[] = initialLinks
      .filter(link => nodeMap.has(link.source) && nodeMap.has(link.target) && typeof link.strength === 'number' && link.strength > 0)
      .map(link => ({
        source: nodeMap.get(link.source)!,
        target: nodeMap.get(link.target)!,
        strength: link.strength,
      }));

    if (graphNodes.length === 0 || graphLinks.length === 0) {
        const gEmpty = svg.attr("width", width).attr("height", height).append("g")
          .attr("transform", `translate(${width / 2}, ${height / 2})`);
        gEmpty.append(() => React.createElement(TrendingUp, { className: "w-16 h-16 text-gray-300" }) as unknown as Element)
          .attr('x', -32).attr('y', -50);
        gEmpty.append("text").attr("text-anchor", "middle").attr("y", 20)
          .style("font-size", "14px").style("fill", "#6B7280")
          .text("No valid coupling data after filtering.");
        return;
    }

    const g = svg.append("g");
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const simulation = d3.forceSimulation<CouplingNode>(graphNodes)
      .force("link", d3.forceLink<CouplingNode, CouplingLink>(graphLinks)
          .id((d: CouplingNode) => d.id)
          .distance(d => Math.min(150, Math.max(40, 100 / Math.max(0.1, d.strength))))
          .strength(d => Math.max(0.05, d.strength / 15))) 
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.5)
      .selectAll("line")
      .data(graphLinks)
      .join("line")
      .attr("stroke-width", d => Math.max(1, Math.sqrt(d.strength)));

    const node = g.append("g")
      .selectAll<SVGGElement, CouplingNode>("g")
      .data(graphNodes)
      .join("g")
      .call(d3.drag<SVGGElement, CouplingNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }))
      .on("mouseover", (event: MouseEvent, d: CouplingNode) => {
        d3.select(event.currentTarget as SVGGElement).select("circle").attr("stroke-width", 2).attr("stroke", "black");
        setTooltipContent(`
          <div class="font-semibold">${d.name}</div>
          <div class="text-xs text-gray-300">${d.path}</div>
          <div class="text-xs">Group: ${d.group}</div>
        `);
        setTooltipPosition({ x: event.pageX + 10, y: event.pageY - 10 });

        const connectedNodeIds = new Set([d.id]);
        graphLinks.forEach(l => {
            if ((l.source as CouplingNode).id === d.id) connectedNodeIds.add((l.target as CouplingNode).id);
            if ((l.target as CouplingNode).id === d.id) connectedNodeIds.add((l.source as CouplingNode).id);
        });
        
        node.each(function(node_d: CouplingNode) {
          const isConnected = connectedNodeIds.has(node_d.id);
          d3.select(this).selectAll("circle").attr("opacity", isConnected ? 1 : 0.2);
          d3.select(this).selectAll("text").attr("opacity", isConnected ? 1 : 0.2);
        });
        link.attr("stroke-opacity", (l: CouplingLink) => ((l.source as CouplingNode).id === d.id || (l.target as CouplingNode).id === d.id) ? 0.9 : 0.1);
      })
      .on("mouseout", function() { // Changed to function to use 'this'
        d3.select(this).select("circle").attr("stroke-width", 0.5).attr("stroke", "#fff");
        setTooltipContent(null);
        node.selectAll("circle").attr("opacity", 0.9);
        node.selectAll("text").attr("opacity", 1);
        link.attr("stroke-opacity", 0.5);
      });

    node.append("circle")
      .attr("r", d => 6 + Math.sqrt(d.group + 1)) // Slightly larger base radius
      .attr("fill", d => color(d.group.toString()))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.9);

    node.append("text")
      .text(d => d.name)
      .attr("font-size", "9px")
      .attr("dx", d => 10 + Math.sqrt(d.group + 1))
      .attr("dy", "0.35em")
      .style("pointer-events", "none")
      .style("fill", "#222");

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoomBehavior);

    const legendGroups = Array.from(new Set(graphNodes.map(n => n.group))).sort((a,b)=>a-b).slice(0, 10);
    if (legendGroups.length > 1) { // Only show legend if there's more than one group
        const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(20, 20)`);
        
        legendGroups.forEach((group, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 18})`);
        row.append("circle").attr("r", 5).attr("fill", color(group.toString())).attr("cy", -2.5);
        row.append("text").attr("x", 10).text(`Group ${group}`).style("font-size", "10px").style("fill", "#333");
        });
    }

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as CouplingNode).x!)
        .attr("y1", d => (d.source as CouplingNode).y!)
        .attr("x2", d => (d.target as CouplingNode).x!)
        .attr("y2", d => (d.target as CouplingNode).y!);
      node
        .attr("transform", d => `translate(${d.x!},${d.y!})`);
    });

  }, [initialNodes, initialLinks, width, height]);

  return (
    <div className="relative p-4 bg-white rounded-lg shadow border border-gray-200">
      <svg ref={svgRef} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}></svg>
      {tooltipContent && tooltipPosition && (
        <div
          className="absolute p-2 bg-gray-800 text-white rounded-md shadow-lg text-xs pointer-events-none"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y, opacity: 0.95, zIndex: 1000, transform: 'translateY(-100%)' }}
          dangerouslySetInnerHTML={{ __html: tooltipContent }}
        />
      )}
      <div className="mt-3 text-xs text-gray-500 text-center max-w-md mx-auto">
        <p>Force-directed graph showing temporal coupling. Nodes are files, links indicate they were changed together. Hover for details, drag to explore.</p>
      </div>
    </div>
  );
};

export default TemporalCouplingGraph;
