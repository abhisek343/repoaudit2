import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Aperture } from 'lucide-react'; // For empty state
import ReactDOMServer from 'react-dom/server';

export interface DependencyData { // Export for DiagramsPage
  source: string;
  target: string;
  value: number; // Number of dependencies/connections
}

interface ComponentDependencyWheelProps {
  dependencies?: DependencyData[]; // Make optional
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
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!dependencies || dependencies.length === 0) {
      const g = svg.attr("width", width).attr("height", height).append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);
      const iconHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(Aperture, { className: "w-16 h-16 text-gray-400" }));
      g.append('g').attr('transform', 'translate(-32, -50)').html(iconHtml);
      g.append("text").attr("text-anchor", "middle").attr("y", 20)
        .style("font-size", "14px").style("fill", "#6B7280")
        .text("No dependency data to display.");
      return;
    }
    
    // Limit for performance and readability
    const MAX_NODES = 15;
    const MAX_LINKS = 50;

    const allNodeNames = Array.from(new Set([
      ...dependencies.map(d => d.source),
      ...dependencies.map(d => d.target)
    ])).filter(name => typeof name === 'string' && name.trim() !== '');

    // Prioritize nodes with more connections if exceeding MAX_NODES
    let finalNodes: string[];
    if (allNodeNames.length > MAX_NODES) {
        const nodeCounts: Record<string, number> = {};
        dependencies.forEach(d => {
            nodeCounts[d.source] = (nodeCounts[d.source] || 0) + d.value;
            nodeCounts[d.target] = (nodeCounts[d.target] || 0) + d.value;
        });
        finalNodes = Object.entries(nodeCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, MAX_NODES)
            .map(([name]) => name);
    } else {
        finalNodes = allNodeNames;
    }
    
    const filteredDependencies = dependencies
        .filter(d => finalNodes.includes(d.source) && finalNodes.includes(d.target) && d.source !== d.target)
        .slice(0, MAX_LINKS);

    if (finalNodes.length < 2 || filteredDependencies.length === 0) {
         const g = svg.attr("width", width).attr("height", height).append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);
         const iconHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(Aperture, { className: "w-16 h-16 text-gray-400" }));
         g.append('g').attr('transform', 'translate(-32, -50)').html(iconHtml);
         g.append("text").attr("text-anchor", "middle").attr("y", 20)
            .style("font-size", "14px").style("fill", "#6B7280")
            .text("Not enough valid dependencies to form a wheel.");
         return;
    }

    const matrix = Array(finalNodes.length).fill(0).map(() => Array(finalNodes.length).fill(0));
    filteredDependencies.forEach(dep => {
      const sourceIndex = finalNodes.indexOf(dep.source);
      const targetIndex = finalNodes.indexOf(dep.target);
      // Value should represent strength of dependency, ensure it's positive
      matrix[sourceIndex][targetIndex] = Math.max(1, dep.value || 1); 
    });

    const outerRadius = Math.min(width, height) * 0.5 - 60; // Adjusted for labels
    const innerRadius = outerRadius - 20; // Thicker arcs

    const chordLayout = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);

    const chords = chordLayout(matrix);

    const g = svg.attr("width", width).attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`)
      .datum(chords);

    const group = g.append("g")
      .selectAll("g")
      .data((d: d3.Chords) => d.groups)
      .join("g");

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    group.append("path")
      .style("fill", (d: d3.ChordGroup) => color(d.index.toString()))
      .style("stroke", (d: d3.ChordGroup) => d3.rgb(color(d.index.toString())).darker().toString())
      .attr("d", d3.arc<d3.ChordGroup>().innerRadius(innerRadius).outerRadius(outerRadius))
      .style("cursor", "default")
      .on("mouseover", function(event, d: d3.ChordGroup) {
        d3.select(this).style("fill-opacity", 0.7);
         const tooltip = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("position", "absolute").style("background", "rgba(0,0,0,0.8)").style("color", "white")
          .style("padding", "8px 12px").style("border-radius", "6px").style("font-size", "12px")
          .style("pointer-events", "none").style("opacity", 0).style("z-index", 1000)
          .style("transition", "opacity 0.2s");
        tooltip.html(`<strong>${finalNodes[d.index]}</strong><br/>Total Connections: ${d.value.toFixed(0)}`)
          .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px")
          .transition().duration(150).style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).style("fill-opacity", 1);
        d3.selectAll(".tooltip").remove();
      });

    group.append("text")
      .each((d: d3.ChordGroup & { angle?: number }) => { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("transform", (d: d3.ChordGroup & { angle?: number }) => `
        rotate(${(d.angle! * 180 / Math.PI - 90)})
        translate(${outerRadius + 5})
        ${d.angle! > Math.PI ? "rotate(180)" : ""}
      `)
      .style("text-anchor", (d: d3.ChordGroup & { angle?: number }) => d.angle! > Math.PI ? "end" : null)
      .text((d: d3.ChordGroup) => {
          const name = finalNodes[d.index];
          return name.length > 15 ? name.substring(0, 12) + "..." : name;
      })
      .style("font-size", "10px")
      .style("fill", "#374151"); // gray-700

    g.append("g")
      .attr("fill-opacity", 0.75)
      .selectAll("path")
      .data((d: d3.Chords) => d) // d here is Chords
      .join("path")
        .style("mix-blend-mode", "multiply")
        .attr("d", d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(innerRadius)) // d3.ribbon() expects d3.Chord
        .style("fill", (d: d3.Chord) => color(d.target.index.toString()))
        .style("stroke", (d: d3.Chord) => d3.rgb(color(d.target.index.toString())).darker().toString())
        .style("cursor", "default")
        .on("mouseover", function(event, d: d3.Chord) {
            d3.select(this).attr("fill-opacity", 1);
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute").style("background", "rgba(0,0,0,0.8)").style("color", "white")
                .style("padding", "8px 12px").style("border-radius", "6px").style("font-size", "12px")
                .style("pointer-events", "none").style("opacity", 0).style("z-index", 1000)
                .style("transition", "opacity 0.2s");
            tooltip.html(`<strong>${finalNodes[d.source.index]}</strong> → <strong>${finalNodes[d.target.index]}</strong><br/>Connections: ${d.source.value.toFixed(0)}`)
                .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px")
                .transition().duration(150).style("opacity", 1);
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill-opacity", 0.75);
            d3.selectAll(".tooltip").remove();
        });

  }, [dependencies, width, height]);

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow border border-gray-200">
      <svg ref={svgRef} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}></svg>
      <div className="mt-4 text-xs text-gray-500 text-center max-w-md">
        <p>Dependency wheel showing inter-module relationships. Chord thickness represents the number of connections.</p>
      </div>
    </div>
  );
};

export default ComponentDependencyWheel;
