// frontend/src/components/diagrams/PRLifecycleGantt.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PullRequestData } from '../../types/advanced';
import ErrorDisplay from '../ui/ErrorDisplay';
import VisualizationErrorBoundary from '../VisualizationErrorBoundary';

interface Props {
  data: PullRequestData[];
}

const PRLifecycleGantt: React.FC<Props> = ({ data }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !ref.current) return;
    
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    
    const margin = { top: 20, right: 30, bottom: 40, left: 150 };
    const width = parseInt(svg.style('width')) - margin.left - margin.right;
    const height = parseInt(svg.style('height')) - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    
    const parsedData = data.map(d => ({...d, createdAt: new Date(d.createdAt), closedAt: d.closedAt ? new Date(d.closedAt) : new Date() }))
                           .sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime());

    const x = d3.scaleTime()
      .domain([d3.min(parsedData, d => d.createdAt)!, d3.max(parsedData, d => d.closedAt)!])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(parsedData.map(d => d.title))
      .range([0, height])
      .padding(0.4);

    g.append("g").call(d3.axisLeft(y).tickFormat(t => t.length > 20 ? t.slice(0, 20) + '...' : t));
    g.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));

    const color = d3.scaleOrdinal<string>().domain(['open', 'merged', 'closed']).range(['#fbbf24', '#4ade80', '#f87171']);

    g.selectAll(".bar")
      .data(parsedData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("y", d => y(d.title)!)
      .attr("height", y.bandwidth())
      .attr("x", d => x(d.createdAt)!)
      .attr("width", d => x(d.closedAt)! - x(d.createdAt)!)
      .attr("fill", d => color(d.state))
      .append("title")
      .text(d => `${d.title}\nState: ${d.state}\nAuthor: ${d.author}\nOpened: ${d.createdAt.toLocaleDateString()}\nClosed: ${d.closedAt.toLocaleDateString()}`);

  }, [data]);
  
  if (!data || data.length === 0) {
    return <ErrorDisplay message="No Pull Request Data" />;
  }

  return (
    <VisualizationErrorBoundary fallbackMessage="Could not render the PR Lifecycle Gantt Chart.">
      <svg ref={ref} style={{ width: '100%', height: '100%' }}></svg>
    </VisualizationErrorBoundary>
  );
};

export default PRLifecycleGantt;
