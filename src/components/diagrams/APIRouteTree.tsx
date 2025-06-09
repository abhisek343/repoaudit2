import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface RouteNode {
  name: string;
  path: string;
  method?: string;
  children?: RouteNode[];
  file?: string;
}

interface APIRouteTreeProps {
  routes: RouteNode;
  width?: number;
  height?: number;
}

const APIRouteTree = ({ routes, width = 800, height = 600 }: APIRouteTreeProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !routes) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create tree layout
    const tree = d3.tree<RouteNode>()
      .size([innerHeight, innerWidth]);

    const root = d3.hierarchy(routes);
    tree(root);

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add links
    g.selectAll(".link")
      .data(root.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x))
      .style("fill", "none")
      .style("stroke", "#ccc")
      .style("stroke-width", 2);

    // Add nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Add circles for nodes
    node.append("circle")
      .attr("r", d => d.data.method ? 8 : 6)
      .style("fill", d => {
        if (d.data.method) {
          switch (d.data.method.toUpperCase()) {
            case 'GET': return '#10B981';
            case 'POST': return '#3B82F6';
            case 'PUT': return '#F59E0B';
            case 'DELETE': return '#EF4444';
            case 'PATCH': return '#8B5CF6';
            default: return '#6B7280';
          }
        }
        return d.children ? '#374151' : '#9CA3AF';
      })
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", d.data.method ? 10 : 8)
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
          <strong>${d.data.name}</strong><br/>
          ${d.data.method ? `Method: ${d.data.method.toUpperCase()}<br/>` : ''}
          Path: ${d.data.path}<br/>
          ${d.data.file ? `File: ${d.data.file}` : ''}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("r", d.data.method ? 8 : 6)
          .style("stroke-width", 2);
        d3.selectAll(".tooltip").remove();
      });

    // Add labels
    node.append("text")
      .attr("dy", ".35em")
      .attr("x", d => d.children ? -13 : 13)
      .style("text-anchor", d => d.children ? "end" : "start")
      .style("font-size", "12px")
      .style("font-weight", d => d.data.method ? "bold" : "normal")
      .style("fill", "#333")
      .text(d => {
        if (d.data.method) {
          return `${d.data.method.toUpperCase()} ${d.data.name}`;
        }
        return d.data.name;
      });

    // Add method legend
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const methodColors = {
      'GET': '#10B981',
      'POST': '#3B82F6',
      'PUT': '#F59E0B',
      'DELETE': '#EF4444',
      'PATCH': '#8B5CF6'
    };

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 100}, 30)`);

    legend.selectAll("circle")
      .data(methods)
      .enter().append("circle")
      .attr("cx", 0)
      .attr("cy", (d, i) => i * 25)
      .attr("r", 6)
      .style("fill", d => methodColors[d as keyof typeof methodColors]);

    legend.selectAll("text")
      .data(methods)
      .enter().append("text")
      .attr("x", 15)
      .attr("y", (d, i) => i * 25 + 5)
      .style("font-size", "12px")
      .style("fill", "#333")
      .text(d => d);

  }, [routes, width, height]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef}></svg>
      <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
        <p>API route tree showing endpoint hierarchy. 
        Colors represent HTTP methods, and the structure shows URL path organization.</p>
      </div>
    </div>
  );
};

export default APIRouteTree;