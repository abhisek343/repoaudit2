import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface CouplingNode {
  id: string;
  name: string;
  path: string;
  group: number;
}

interface CouplingLink {
  source: string;
  target: string;
  strength: number;
  commits: number;
}

interface TemporalCouplingGraphProps {
  nodes: CouplingNode[];
  links: CouplingLink[];
  width?: number;
  height?: number;
}

const TemporalCouplingGraph = ({ 
  nodes, 
  links, 
  width = 800, 
  height = 600 
}: TemporalCouplingGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Limit data to prevent performance issues
    const limitedNodes = nodes.slice(0, 50);
    const limitedLinks = links.slice(0, 100);

    // Validate and clean data
    const validNodes = limitedNodes.filter(node => 
      node && node.id && node.name && typeof node.group === 'number'
    );

    const validLinks = limitedLinks.filter(link => 
      link && 
      link.source && 
      link.target && 
      typeof link.strength === 'number' && 
      isFinite(link.strength) &&
      validNodes.some(n => n.id === link.source) &&
      validNodes.some(n => n.id === link.target) &&
      link.source !== link.target
    );

    if (validNodes.length === 0) {
      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g");

      g.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("No valid nodes to display");
      
      return;
    }

    try {
      // Create force simulation with controlled parameters
      const simulation = d3.forceSimulation(validNodes as any)
        .force("link", d3.forceLink(validLinks)
          .id((d: any) => d.id)
          .distance(d => Math.min(200, Math.max(50, 100 / Math.max(0.1, (d as any).strength))))
          .strength(0.1)
        )
        .force("charge", d3.forceManyBody()
          .strength(-300)
          .distanceMax(400)
        )
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide()
          .radius(25)
          .strength(0.7)
        )
        .alphaDecay(0.05)
        .velocityDecay(0.8);

      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g");

      // Add zoom behavior with limits
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoom as any);

      // Color scale for groups
      const color = d3.scaleOrdinal(d3.schemeCategory10);

      // Add links with validation
      const link = g.append("g")
        .selectAll("line")
        .data(validLinks)
        .enter().append("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => Math.min(10, Math.max(1, Math.sqrt(d.strength * 10))));

      // Add nodes with validation
      const node = g.append("g")
        .selectAll("circle")
        .data(validNodes)
        .enter().append("circle")
        .attr("r", 8)
        .attr("fill", d => color(Math.max(0, d.group).toString()))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .call(d3.drag<SVGCircleElement, CouplingNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            (d as any).fx = (d as any).x;
            (d as any).fy = (d as any).y;
          })
          .on("drag", (event, d) => {
            (d as any).fx = event.x;
            (d as any).fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            (d as any).fx = null;
            (d as any).fy = null;
          }));

      // Add labels with bounds checking
      const label = g.append("g")
        .selectAll("text")
        .data(validNodes)
        .enter().append("text")
        .text(d => {
          const name = d.name.split('/').pop() || d.name;
          return name.length > 15 ? name.substring(0, 15) + '...' : name;
        })
        .style("font-size", "10px")
        .style("text-anchor", "middle")
        .style("fill", "#333")
        .style("pointer-events", "none");

      // Add tooltips with validation
      node
        .on("mouseover", function(event, d) {
          d3.select(this)
            .attr("r", 12)
            .attr("stroke-width", 3);

          // Highlight connected links
          link.style("stroke-opacity", l => 
            (l.source === d.id || l.target === d.id) ? 1 : 0.1
          );

          // Show tooltip
          const connectedFiles = validLinks
            .filter(l => l.source === d.id || l.target === d.id)
            .map(l => l.source === d.id ? l.target : l.source);

          const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          tooltip.html(`
            <strong>${d.name}</strong><br/>
            Path: ${d.path}<br/>
            Connected to: ${connectedFiles.length} files<br/>
            Group: ${d.group}
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this)
            .attr("r", 8)
            .attr("stroke-width", 2);

          link.style("stroke-opacity", 0.6);
          d3.selectAll(".tooltip").remove();
        });

      // Update positions on simulation tick with bounds checking
      let tickCount = 0;
      const maxTicks = 300; // Prevent infinite simulation

      simulation.on("tick", () => {
        tickCount++;
        
        // Stop simulation if it runs too long
        if (tickCount > maxTicks) {
          simulation.stop();
          return;
        }

        // Update links with validation
        link
          .attr("x1", (d: any) => {
            const x = d.source?.x;
            return (typeof x === 'number' && isFinite(x)) ? Math.max(0, Math.min(width, x)) : 0;
          })
          .attr("y1", (d: any) => {
            const y = d.source?.y;
            return (typeof y === 'number' && isFinite(y)) ? Math.max(0, Math.min(height, y)) : 0;
          })
          .attr("x2", (d: any) => {
            const x = d.target?.x;
            return (typeof x === 'number' && isFinite(x)) ? Math.max(0, Math.min(width, x)) : 0;
          })
          .attr("y2", (d: any) => {
            const y = d.target?.y;
            return (typeof y === 'number' && isFinite(y)) ? Math.max(0, Math.min(height, y)) : 0;
          });

        // Update nodes with validation
        node
          .attr("cx", (d: any) => {
            const x = d.x;
            return (typeof x === 'number' && isFinite(x)) ? Math.max(8, Math.min(width - 8, x)) : width / 2;
          })
          .attr("cy", (d: any) => {
            const y = d.y;
            return (typeof y === 'number' && isFinite(y)) ? Math.max(8, Math.min(height - 8, y)) : height / 2;
          });

        // Update labels with validation
        label
          .attr("x", (d: any) => {
            const x = d.x;
            return (typeof x === 'number' && isFinite(x)) ? Math.max(8, Math.min(width - 8, x)) : width / 2;
          })
          .attr("y", (d: any) => {
            const y = d.y;
            return (typeof y === 'number' && isFinite(y)) ? Math.max(28, Math.min(height - 8, y + 20)) : height / 2 + 20;
          });
      });

      // Add legend with validation
      const groups = Array.from(new Set(validNodes.map(n => n.group))).slice(0, 10);
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(20, 20)`);

      legend.selectAll("circle")
        .data(groups)
        .enter().append("circle")
        .attr("cx", 0)
        .attr("cy", (d, i) => i * 20)
        .attr("r", 6)
        .style("fill", d => color(d.toString()));

      legend.selectAll("text")
        .data(groups)
        .enter().append("text")
        .attr("x", 15)
        .attr("y", (d, i) => i * 20 + 5)
        .style("font-size", "12px")
        .style("fill", "#333")
        .text(d => `Group ${d}`);

      // Auto-stop simulation after reasonable time
      setTimeout(() => {
        simulation.stop();
      }, 10000);

    } catch (error) {
      console.error('Error creating temporal coupling graph:', error);
      
      // Fallback visualization
      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g");

      g.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("Unable to render temporal coupling graph");
    }

  }, [nodes, links, width, height]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef}></svg>
      <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
        <p>Temporal coupling graph showing files that are frequently changed together. 
        Thicker lines indicate stronger coupling. Drag nodes to explore relationships.</p>
      </div>
    </div>
  );
};

export default TemporalCouplingGraph;