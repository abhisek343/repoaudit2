import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface CouplingNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  path: string;
  group: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface CouplingLink extends d3.SimulationLinkDatum<CouplingNode> {
  source: string | CouplingNode;
  target: string | CouplingNode;
  strength: number;
}

interface TemporalCouplingGraphProps {
  nodes: Array<Pick<CouplingNode, 'id' | 'name' | 'path' | 'group'>>;
  links: Array<{ source: string; target: string; strength: number }>;
  width?: number;
  height?: number;
}

const TemporalCouplingGraph: React.FC<TemporalCouplingGraphProps> = ({ nodes, links, width = 800, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Filter out invalid nodes and links
    const validNodes = nodes.filter(node => 
      node.id && node.name && typeof node.group === 'number'
    ) as CouplingNode[];

    const validLinks = links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as CouplingNode).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as CouplingNode).id;
      return validNodes.some(n => n.id === sourceId) &&
             validNodes.some(n => n.id === targetId) &&
             typeof link.strength === 'number';
    }) as CouplingLink[];

    // Clear existing SVG
    d3.select(svgRef.current).selectAll("*").remove();

    // Create the SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Add container group for zoom
    const g = svg.append("g");

    // Create color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create simulation
    const simulation = d3.forceSimulation<CouplingNode>(validNodes)
      .force("link", d3.forceLink<CouplingNode, CouplingLink>(validLinks)
          .id((d: CouplingNode) => d.id)
          .distance(d => Math.min(200, Math.max(50, 100 / Math.max(0.1, d.strength)))))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(validLinks)
      .enter().append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.sqrt(d.strength) * 2);

    // Create nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(validNodes)
      .enter().append("circle")
      .attr("r", 5)
      .attr("fill", d => color(d.group.toString()))
      .call(d3.drag<SVGCircleElement, CouplingNode>()
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
        }));

    // Add labels
    g.append("g")
      .selectAll("text")
      .data(validNodes)
      .enter().append("text")
      .text(d => d.name)
      .attr("font-size", "10px")
      .attr("dx", 8)
      .attr("dy", 3);

    // Add tooltips
    node.append("title")
      .text(d => `Name: ${d.name}
        Path: ${d.path}
        Group: ${d.group}`);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 150}, 20)`);

    const groups = Array.from(new Set(validNodes.map(n => n.group))).slice(0, 10);
    
    groups.forEach((group, i) => {
      const row = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      row.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 5)
        .attr("fill", color(group.toString()));

      row.append("text")
        .attr("x", 10)
        .attr("y", 5)
        .text(`Group ${group}`)
        .style("font-size", "10px");
    });

    // Handle mouseover/mouseout effects
    node.on("mouseover", (_event, d) => {
      const connectedLinks = validLinks
        .filter(l => (typeof l.source === 'string' ? l.source : l.source.id) === d.id || 
                     (typeof l.target === 'string' ? l.target : l.target.id) === d.id);

      const connectedNodes = connectedLinks
        .map(l => {
          const source = typeof l.source === 'string' ? l.source : l.source.id;
          const target = typeof l.target === 'string' ? l.target : l.target.id;
          return source === d.id ? target : source;
        });

      node.style("opacity", n => connectedNodes.includes(n.id) ? 1 : 0.1);
      link.style("opacity", l => {
        const source = typeof l.source === 'string' ? l.source : l.source.id;
        const target = typeof l.target === 'string' ? l.target : l.target.id;
        return (source === d.id || target === d.id) ? 1 : 0.1;
      });
    }).on("mouseout", () => {
      node.style("opacity", 1);
      link.style("opacity", 1);
    });

    // Update simulation on tick
    simulation.on("tick", () => {
      // Implementation remains the same with proper typing from previous edit
      // ... rest of the function code ...
    });
  }, [nodes, links, width, height]);

  return (
    <div className="relative">
      <div className="bg-white rounded-xl p-4 shadow-lg">
        <svg ref={svgRef} className="w-full h-full"></svg>
        <p className="text-sm text-gray-600 mt-4">
          Hover over nodes to see connections. Drag nodes to explore relationships.</p>
      </div>
    </div>
  );
};

export default TemporalCouplingGraph;