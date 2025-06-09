import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface FileNode {
  name: string;
  path: string;
  size: number;
  children?: FileNode[];
  type: 'file' | 'directory';
}

interface FileSystemIcicleProps {
  data: FileNode;
  width?: number;
  height?: number;
}

const FileSystemIcicle = ({ data, width = 800, height = 600 }: FileSystemIcicleProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create hierarchy
    const root = d3.hierarchy(data)
      .sum(d => d.type === 'file' ? d.size : 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition<FileNode>()
      .size([width, height])
      .padding(1);

    partition(root);

    // Color scale based on depth
    const color = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, root.height]);

    // Create rectangles
    const cell = svg
      .attr("width", width)
      .attr("height", height)
      .selectAll("g")
      .data(root.descendants())
      .enter().append("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    cell.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => color(d.depth))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke", "#333")
          .attr("stroke-width", 2);

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
          Path: ${d.data.path}<br/>
          ${d.data.type === 'file' ? `Size: ${d.data.size} bytes` : `Children: ${d.children?.length || 0}`}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1);
        d3.selectAll(".tooltip").remove();
      });

    // Add labels for larger rectangles
    cell.append("text")
      .attr("x", 4)
      .attr("y", 14)
      .style("font-size", d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.min(width / 8, height / 4, 12) + "px";
      })
      .style("fill", "white")
      .style("font-weight", "bold")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)")
      .text(d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        if (width > 60 && height > 20) {
          return d.data.name.length > 15 ? d.data.name.substring(0, 15) + '...' : d.data.name;
        }
        return '';
      });

    // Add depth indicators
    const depthScale = d3.scaleLinear()
      .domain([0, root.height])
      .range([0, 20]);

    svg.append("g")
      .attr("class", "depth-legend")
      .attr("transform", `translate(${width - 150}, 20)`)
      .selectAll("rect")
      .data(d3.range(root.height + 1))
      .enter().append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * 25)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", d => color(d))
      .attr("stroke", "#fff");

    svg.select(".depth-legend")
      .selectAll("text")
      .data(d3.range(root.height + 1))
      .enter().append("text")
      .attr("x", 25)
      .attr("y", (d, i) => i * 25 + 15)
      .style("font-size", "12px")
      .style("fill", "#333")
      .text(d => `Depth ${d}`);

  }, [data, width, height]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef}></svg>
      <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
        <p>Icicle chart showing directory structure hierarchy. 
        Colors represent depth levels, and size represents file sizes.</p>
      </div>
    </div>
  );
};

export default FileSystemIcicle;