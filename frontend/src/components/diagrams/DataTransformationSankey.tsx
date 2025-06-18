// frontend/src/components/diagrams/DataTransformationSankey.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { SankeyData } from '../../types/advanced';
import ErrorDisplay from '../ui/ErrorDisplay';
import VisualizationErrorBoundary from '../VisualizationErrorBoundary';

interface Props {
  data: SankeyData;
}

const DataTransformationSankey: React.FC<Props> = ({ data }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0 || !ref.current) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = parseInt(svg.style('width'));
    const height = parseInt(svg.style('height'));

    const sankeyLayout = sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [width - 1, height - 6]]);

    const graph = sankeyLayout(data as any);

    // Links
    svg.append("g")
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-opacity", 0.4)
      .selectAll("g")
      .data(graph.links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke-width", d => Math.max(1, d.width || 0));

    // Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(graph.nodes)
      .join("g");

    node.append("rect")
      .attr("x", d => d.x0 || 0)
      .attr("y", d => d.y0 || 0)
      .attr("height", d => (d.y1 || 0) - (d.y0 || 0))
      .attr("width", d => (d.x1 || 0) - (d.x0 || 0))
      .attr("fill", "#a5b4fc");

    // Node labels
    node.append("text")
      .attr("x", d => ((d.x0 || 0) < width / 2 ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6))
      .attr("y", d => ((d.y1 || 0) + (d.y0 || 0)) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => ((d.x0 || 0) < width / 2 ? "start" : "end"))
      .text((d: any) => d.id)
      .style("fill", "var(--text-color-primary)")
      .style("font-size", "12px");

  }, [data]);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return <ErrorDisplay message="No Data Transformation Flow Data" />;
  }

  return (
    <VisualizationErrorBoundary fallbackMessage="Could not render the Sankey Diagram.">
      <svg ref={ref} style={{ width: '100%', height: '100%' }}></svg>
    </VisualizationErrorBoundary>
  );
};

export default DataTransformationSankey;
