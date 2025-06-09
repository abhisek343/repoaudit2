import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface SankeyNode {
  id: string;
  name: string;
  category: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface DataTransformationSankeyProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
}

const DataTransformationSankey = ({ 
  nodes, 
  links, 
  width = 800, 
  height = 400 
}: DataTransformationSankeyProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Simple Sankey-like layout (simplified version)
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const categories = Array.from(new Set(nodes.map(n => n.category)));
    const categoryWidth = innerWidth / categories.length;

    // Position nodes by category
    const positionedNodes = nodes.map((node, i) => {
      const categoryIndex = categories.indexOf(node.category);
      const nodesInCategory = nodes.filter(n => n.category === node.category);
      const nodeIndex = nodesInCategory.indexOf(node);
      
      return {
        ...node,
        x: categoryIndex * categoryWidth + categoryWidth / 2,
        y: (nodeIndex + 1) * (innerHeight / (nodesInCategory.length + 1)),
        width: 20,
        height: 40
      };
    });

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add links
    const linkGenerator = d3.linkHorizontal<any, any>()
      .source(d => {
        const sourceNode = positionedNodes.find(n => n.id === d.source);
        return [sourceNode!.x + sourceNode!.width, sourceNode!.y + sourceNode!.height / 2];
      })
      .target(d => {
        const targetNode = positionedNodes.find(n => n.id === d.target);
        return [targetNode!.x, targetNode!.y + targetNode!.height / 2];
      });

    g.selectAll(".link")
      .data(links)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", linkGenerator)
      .style("fill", "none")
      .style("stroke", "#999")
      .style("stroke-opacity", 0.6)
      .style("stroke-width", d => Math.max(2, d.value / 10))
      .on("mouseover", function(event, d) {
        d3.select(this)
          .style("stroke", "#333")
          .style("stroke-opacity", 1);

        // Show tooltip
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

        const sourceNode = nodeMap.get(d.source);
        const targetNode = nodeMap.get(d.target);

        tooltip.html(`
          <strong>${sourceNode?.name} → ${targetNode?.name}</strong><br/>
          Data flow: ${d.value} records
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .style("stroke", "#999")
          .style("stroke-opacity", 0.6);
        d3.selectAll(".tooltip").remove();
      });

    // Add nodes
    const node = g.selectAll(".node")
      .data(positionedNodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("rect")
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .style("fill", d => color(d.category))
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .style("stroke", "#333")
          .style("stroke-width", 3);

        // Show tooltip
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
          Category: ${d.category}<br/>
          Stage: ${d.category}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .style("stroke", "#fff")
          .style("stroke-width", 2);
        d3.selectAll(".tooltip").remove();
      });

    // Add node labels
    node.append("text")
      .attr("x", d => d.width / 2)
      .attr("y", d => d.height / 2)
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "white")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .text(d => d.name.length > 8 ? d.name.substring(0, 8) + '...' : d.name);

    // Add category labels
    g.selectAll(".category-label")
      .data(categories)
      .enter().append("text")
      .attr("class", "category-label")
      .attr("x", (d, i) => i * categoryWidth + categoryWidth / 2)
      .attr("y", -5)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text(d => d);

  }, [nodes, links, width, height]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full overflow-auto" style={{ width: width, height: height }}>
        <svg ref={svgRef} className="min-w-[800px] min-h-[500px]"></svg>
      </div>
      <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
        <p>Sankey diagram showing data flow between system components. 
        Width of connections represents data volume.</p>
      </div>
    </div>
  );
};

export default DataTransformationSankey;