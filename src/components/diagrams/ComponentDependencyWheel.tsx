import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DependencyData {
  source: string;
  target: string;
  value: number;
}

interface ComponentDependencyWheelProps {
  dependencies: DependencyData[];
  width?: number;
  height?: number;
}

const ComponentDependencyWheel = ({ 
  dependencies, 
  width = 600, 
  height = 600 
}: ComponentDependencyWheelProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !dependencies.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Limit the number of dependencies to prevent performance issues
    const limitedDependencies = dependencies.slice(0, 20);
    
    const radius = Math.min(width, height) / 2 - 40;
    const innerRadius = radius - 120;

    // Get unique nodes with validation
    const nodes = Array.from(new Set([
      ...limitedDependencies.map(d => d.source),
      ...limitedDependencies.map(d => d.target)
    ])).filter(node => node && typeof node === 'string').slice(0, 15); // Limit nodes

    if (nodes.length === 0) {
      // Show empty state
      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("No dependency data available");
      
      return;
    }

    // Create matrix with bounds checking
    const matrix = Array(nodes.length).fill(null).map(() => Array(nodes.length).fill(0));
    
    limitedDependencies.forEach(dep => {
      const sourceIndex = nodes.indexOf(dep.source);
      const targetIndex = nodes.indexOf(dep.target);
      if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
        // Ensure value is finite and reasonable
        const value = Math.min(100, Math.max(1, dep.value || 1));
        matrix[sourceIndex][targetIndex] = value;
      }
    });

    // Validate matrix has data
    const hasData = matrix.some(row => row.some(val => val > 0));
    if (!hasData) {
      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("No valid dependencies found");
      
      return;
    }

    try {
      const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);

      const chords = chord(matrix);

      // Validate chords data
      if (!chords || !chords.groups || chords.groups.length === 0) {
        throw new Error('Invalid chord data');
      }

      const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(innerRadius + 20);

      const ribbon = d3.ribbon()
        .radius(innerRadius);

      const color = d3.scaleOrdinal(d3.schemeCategory10);

      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      // Add groups (components) with error handling
      const group = g.append("g")
        .selectAll("g")
        .data(chords.groups)
        .enter().append("g");

      group.append("path")
        .style("fill", (d, i) => color(i.toString()))
        .style("stroke", "#fff")
        .attr("d", d => {
          try {
            return arc(d as any);
          } catch (error) {
            console.warn('Error rendering arc:', error);
            return null;
          }
        });

      // Add component labels with bounds checking
      group.append("text")
        .each(function(d) { 
          if (d && typeof d.startAngle === 'number' && typeof d.endAngle === 'number') {
            (d as any).angle = (d.startAngle + d.endAngle) / 2; 
          }
        })
        .attr("dy", ".35em")
        .attr("transform", function(d: any) {
          if (!d || typeof d.angle !== 'number' || !isFinite(d.angle)) {
            return "translate(0,0)";
          }
          const angle = d.angle * 180 / Math.PI - 90;
          const translate = innerRadius + 26;
          const rotate = d.angle > Math.PI ? 180 : 0;
          return `rotate(${angle}) translate(${translate},0) rotate(${rotate})`;
        })
        .style("text-anchor", function(d: any) { 
          return d && d.angle > Math.PI ? "end" : "start"; 
        })
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text((d, i) => {
          const nodeName = nodes[i];
          return nodeName ? (nodeName.length > 12 ? nodeName.substring(0, 12) + '...' : nodeName) : '';
        });

      // Add chords (dependencies) with validation
      g.append("g")
        .selectAll("path")
        .data(chords.filter(d => d && d.source && d.target))
        .enter().append("path")
        .attr("d", d => {
          try {
            return ribbon(d as any);
          } catch (error) {
            console.warn('Error rendering ribbon:', error);
            return null;
          }
        })
        .style("fill", (d: any) => {
          if (d && d.source && typeof d.source.index === 'number') {
            return color(d.source.index.toString());
          }
          return color('0');
        })
        .style("opacity", 0.7)
        .style("stroke", "#fff")
        .style("stroke-width", "1px")
        .on("mouseover", function(event, d: any) {
          d3.select(this).style("opacity", 1);
          
          if (d && d.source && d.target && 
              typeof d.source.index === 'number' && 
              typeof d.target.index === 'number' &&
              nodes[d.source.index] && nodes[d.target.index]) {
            
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

            tooltip.html(`${nodes[d.source.index]} → ${nodes[d.target.index]}<br/>Dependencies: ${d.source.value || 0}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
          }
        })
        .on("mouseout", function() {
          d3.select(this).style("opacity", 0.7);
          d3.selectAll(".tooltip").remove();
        });

    } catch (error) {
      console.error('Error creating chord diagram:', error);
      
      // Fallback to simple visualization
      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("Unable to render dependency wheel");
    }

  }, [dependencies, width, height]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef}></svg>
      <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
        <p>Component dependency wheel showing relationships between modules. 
        Thicker chords indicate more dependencies between components.</p>
      </div>
    </div>
  );
};

export default ComponentDependencyWheel;