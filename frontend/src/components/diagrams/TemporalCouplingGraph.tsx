// frontend/src/components/diagrams/TemporalCouplingGraph.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TemporalCoupling } from '../../types/advanced';
import ErrorDisplay from '../ui/ErrorDisplay';
import VisualizationErrorBoundary from '../VisualizationErrorBoundary';

interface Props {
  data: TemporalCoupling[];
}

const TemporalCouplingGraph: React.FC<Props> = ({ data }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !ref.current) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = parseInt(svg.style('width'));
    const height = parseInt(svg.style('height'));

    const nodes = Array.from(new Set(data.flatMap(d => [d.source, d.target])), id => ({ id }));
    const links = data.map(d => ({ source: d.source, target: d.target, weight: d.weight }));

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.weight));

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", "#6366f1")
      .call(drag(simulation) as any)
      .append("title")
      .text((d: any) => `File: ${d.id}`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
    });

    function drag(simulation: any) {
        function dragstarted(event: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        function dragged(event: any) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        function dragended(event: any) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }

  }, [data]);

  if (!data || data.length === 0) {
    return <ErrorDisplay message="No Temporal Coupling Data" />;
  }

  return (
    <VisualizationErrorBoundary fallbackMessage="Could not render the Temporal Coupling Graph.">
        <svg ref={ref} style={{ width: '100%', height: '100%' }}></svg>
    </VisualizationErrorBoundary>
  );
};

export default TemporalCouplingGraph;
