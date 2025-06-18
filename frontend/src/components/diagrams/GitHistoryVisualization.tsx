// frontend/src/components/diagrams/GitHistoryVisualization.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GitGraphData } from '../../types/advanced';
import ErrorDisplay from '../ui/ErrorDisplay';
import VisualizationErrorBoundary from '../VisualizationErrorBoundary';

interface Props {
  data: GitGraphData;
}

const GitHistoryVisualization: React.FC<Props> = ({ data }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0 || !ref.current) return;    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    
    // Simple layout algorithm
    const nodesById = new Map(data.nodes.map(node => [node.id, node]));
    const children = new Map(data.nodes.map(node => [node.id, [] as string[]]));
    data.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        children.get(sourceId)?.push(targetId);
    });

    let y = margin.top;
    const xPositions: { [key: number]: number } = {};
    let column = 0;
    
    data.nodes.forEach(node => {
        node.y = y;
        y += 40;
        
        const nodeColumn = Object.keys(xPositions).find(col => xPositions[parseInt(col)] < node.y!);
        if (nodeColumn === undefined) {
            node.x = margin.left + (column * 30);
            xPositions[column] = node.y + 100; // Reserve space
            column++;
        } else {
            node.x = margin.left + (parseInt(nodeColumn) * 30);
            xPositions[parseInt(nodeColumn)] = node.y + 100;
        }
    });

    const g = svg.append("g");

    g.append("g")
      .attr("fill", "none")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1.5)
      .selectAll("path")
      .data(data.links)
      .join("path")
      .attr("d", d => {
        const source = nodesById.get(typeof d.source === 'string' ? d.source : d.source.id)!;
        const target = nodesById.get(typeof d.target === 'string' ? d.target : d.target.id)!;
        return `M${source.x},${source.y} C${source.x},${(source.y! + target.y!) / 2} ${target.x},${(source.y! + target.y!) / 2} ${target.x},${target.y}`;
      });

    g.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("cx", d => d.x!)
      .attr("cy", d => d.y!)
      .attr("r", 5)
      .attr("fill", "#6366f1")
      .append("title")
      .text(d => `${d.id.substring(0, 7)}\nAuthor: ${d.author}\n${d.message}`);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(zoom);

  }, [data]);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return <ErrorDisplay message="No Git History Data" />;
  }

  return (
    <VisualizationErrorBoundary fallbackMessage="Could not render the Git History Graph.">
      <svg ref={ref} style={{ width: '100%', height: '100%' }}></svg>
    </VisualizationErrorBoundary>
  );
};

export default GitHistoryVisualization;
