import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ServerCrash } from 'lucide-react'; // For error/empty state
import ReactDOMServer from 'react-dom/server';

export interface RouteNode { // Exporting for use in DiagramsPage if needed for type consistency
  name: string;
  path: string;
  method?: string;
  children?: RouteNode[];
  file?: string; // File where the route is defined
}

interface APIRouteTreeProps {
  routes?: RouteNode; // Make routes optional to handle cases where it might be undefined
  width?: number;
  height?: number;
}

const APIRouteTree = ({ routes, width = 800, height = 600 }: APIRouteTreeProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    if (!routes || !routes.children || routes.children.length === 0) {
      // Display empty state or error message
      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

      const iconHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(ServerCrash, { className: "w-16 h-16 text-gray-400" }));
      g.append('g').attr('transform', 'translate(-32, -50)').html(iconHtml);
      
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("y", 20)
        .style("font-size", "14px")
        .style("fill", "#6B7280") // gray-500
        .text("No API route data available to display.");
      return;
    }

    const margin = { top: 20, right: 120, bottom: 80, left: 120 }; // Increased bottom margin for legend
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const tree = d3.tree<RouteNode>()
      .size([innerHeight, innerWidth]);

    const root = d3.hierarchy(routes);
    tree(root);

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal<d3.HierarchyLink<RouteNode>, d3.HierarchyPointNode<RouteNode>>()
        .x(d => d.y)
        .y(d => d.x))
      .style("fill", "none")
      .style("stroke", "#9CA3AF") // gray-400
      .style("stroke-width", 1.5);

    // Nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", (d: d3.HierarchyNode<RouteNode>) => `node ${d.children ? "node--internal" : "node--leaf"}`)
      .attr("transform", (dNode: d3.HierarchyNode<RouteNode>) => {
        const d = dNode as d3.HierarchyPointNode<RouteNode>;
        return `translate(${d.y},${d.x})`;
      });

    node.append("circle")
      .attr("r", (d: d3.HierarchyNode<RouteNode>) => d.data.method ? 7 : 5)
      .style("fill", (d: d3.HierarchyNode<RouteNode>) => {
        if (d.data.method) {
          switch (d.data.method.toUpperCase()) {
            case 'GET': return '#10B981'; // green-500
            case 'POST': return '#3B82F6'; // blue-500
            case 'PUT': return '#F59E0B'; // amber-500
            case 'DELETE': return '#EF4444'; // red-500
            case 'PATCH': return '#8B5CF6'; // violet-500
            default: return '#6B7280'; // gray-500
          }
        }
        return d.children ? '#4B5563' : '#9CA3AF'; // gray-700 for parent, gray-400 for segment
      })
      .style("stroke", "#fff")
      .style("stroke-width", 1.5)
      .style("cursor", "default") // No specific click action defined yet
      .on("mouseover", function(event, d: d3.HierarchyNode<RouteNode>) { // Changed d to HierarchyNode
        const dPoint = d as d3.HierarchyPointNode<RouteNode>; // Cast for properties if needed, though d.data is fine
        d3.select(this)
          .transition().duration(150)
          .attr("r", dPoint.data.method ? 9 : 7)
          .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.2))");

        const tooltip = d3.select("body").append("div")
          .attr("class", "tooltip") // Ensure this class is styled globally or via Tailwind
          .style("position", "absolute")
          .style("background", "rgba(0,0,0,0.85)")
          .style("color", "white")
          .style("padding", "8px 12px")
          .style("border-radius", "6px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("opacity", 0)
          .style("z-index", "1000")
          .style("transition", "opacity 0.2s");

        tooltip.html(`
          <strong class="font-semibold block mb-0.5">${d.data.name}</strong>
          ${d.data.method ? `<span class="text-xs uppercase font-medium px-1.5 py-0.5 rounded ${
            d.data.method.toUpperCase() === 'GET' ? 'bg-green-600' :
            d.data.method.toUpperCase() === 'POST' ? 'bg-blue-600' :
            d.data.method.toUpperCase() === 'PUT' ? 'bg-amber-600' :
            d.data.method.toUpperCase() === 'DELETE' ? 'bg-red-600' :
            d.data.method.toUpperCase() === 'PATCH' ? 'bg-violet-600' : 'bg-gray-600'
          }">${d.data.method.toUpperCase()}</span><br/>` : ''}
          Path: <code class="text-xs">${d.data.path}</code><br/>
          ${d.data.file ? `File: <span class="text-gray-300 text-xs">${d.data.file}</span>` : ''}
        `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 15) + "px")
          .transition().duration(150)
          .style("opacity", 1);
      })
      .on("mouseout", function(_event, d: d3.HierarchyNode<RouteNode>) { // Changed event to _event to indicate unused
        const dPoint = d as d3.HierarchyPointNode<RouteNode>; // Cast for properties if needed
        d3.select(this)
          .transition().duration(150)
          .attr("r", dPoint.data.method ? 7 : 5)
          .style("filter", "none");
        d3.selectAll(".tooltip").remove();
      });

    // Labels
    node.append("text")
      .attr("dy", "0.32em")
      .attr("x", (dNode: d3.HierarchyNode<RouteNode>) => {
        const d = dNode as d3.HierarchyPointNode<RouteNode>;
        return d.children ? -10 : 10;
      })
      .style("text-anchor", (dNode: d3.HierarchyNode<RouteNode>) => {
        const d = dNode as d3.HierarchyPointNode<RouteNode>;
        return d.children ? "end" : "start";
      })
      .style("font-size", "11px")
      .style("font-weight", (d: d3.HierarchyNode<RouteNode>) => d.data.method ? "600" : "400")
      .style("fill", "#1F2937") // gray-800
      .text((d: d3.HierarchyNode<RouteNode>) => {
        const name = d.data.method ? `${d.data.method.toUpperCase()} ${d.data.name}` : d.data.name;
        return name.length > 20 ? name.substring(0, 18) + "..." : name;
      });

    // Legend
    const methods = [
        { name: 'GET', color: '#10B981'}, 
        { name: 'POST', color: '#3B82F6'}, 
        { name: 'PUT', color: '#F59E0B'}, 
        { name: 'DELETE', color: '#EF4444'}, 
        { name: 'PATCH', color: '#8B5CF6'},
        { name: 'Path Segment', color: '#4B5563'}
    ];

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${margin.left}, ${innerHeight + margin.top + 30})`); // Position legend below chart

    const legendItem = legend.selectAll(".legend-item")
      .data(methods)
      .enter().append("g")
      .attr("class", "legend-item")
      .attr("transform", (_d, i) => `translate(${i * 110}, 0)`); // Changed d to _d if not used

    legendItem.append("circle")
      .attr("r", 5)
      .style("fill", d => d.color);

    legendItem.append("text")
      .attr("x", 10)
      .attr("y", 0)
      .attr("dy", "0.32em")
      .style("font-size", "10px")
      .style("fill", "#374151") // gray-700
      .text(d => d.name);

  }, [routes, width, height]);

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow border border-gray-200">
      <svg ref={svgRef} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}></svg>
      <div className="mt-4 text-xs text-gray-500 text-center max-w-md">
        <p>This tree visualizes the API route structure. Circles represent path segments or HTTP methods. Hover for details.</p>
      </div>
    </div>
  );
};

export default APIRouteTree;
