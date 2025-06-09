import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RefreshCw, Calendar, GitBranch, GitCommit, Users } from 'lucide-react';
import { Commit as AnalysisCommit } from '../../types';

interface GitHistoryVisualizationProps {
  commits: AnalysisCommit[];
  contributors: Array<{
    login: string;
    contributions: number;
    avatarUrl: string;
  }>;
  onCommitSelect?: (commit: AnalysisCommit) => void;
}

const GitHistoryVisualization: React.FC<GitHistoryVisualizationProps> = ({
  commits,
  contributors,
  onCommitSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedCommit, setSelectedCommit] = useState<AnalysisCommit | null>(null);
  const [timeRange, setTimeRange] = useState<[Date, Date]>([new Date(), new Date()]);

  useEffect(() => {
    if (!svgRef.current || !commits.length) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(commits, d => new Date(d.author.date)) as [Date, Date])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, commits.length])
      .range([height - margin.bottom, margin.top]);

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        setZoom(event.transform.k);
        svg.selectAll('.commit-circle')
          .attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Draw commit lines
    const line = d3.line<AnalysisCommit>()
      .x(d => xScale(new Date(d.author.date)))
      .y((d, i) => yScale(i));

    svg.append('path')
      .datum(commits)
      .attr('class', 'commit-line')
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 2);

    // Draw commit circles
    const commitCircles = svg.selectAll('.commit-circle')
      .data(commits)
      .enter()
      .append('g')
      .attr('class', 'commit-circle')
      .on('click', (event, d) => {
        setSelectedCommit(d);
        onCommitSelect?.(d);
      });

    commitCircles.append('circle')
      .attr('cx', d => xScale(new Date(d.author.date)))
      .attr('cy', (d, i) => yScale(i))
      .attr('r', 6)
      .attr('fill', d => {
        const contributor = contributors.find(c => 
          c.login.toLowerCase() === d.author.name.toLowerCase()
        );
        return contributor ? '#4f46e5' : '#94a3b8';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add hover effects
    commitCircles
      .on('mouseover', function(event, d) {
        d3.select(this)
          .select('circle')
          .attr('r', 8)
          .attr('stroke', '#4f46e5');
      })
      .on('mouseout', function() {
        d3.select(this)
          .select('circle')
          .attr('r', 6)
          .attr('stroke', '#fff');
      });

    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis);

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis);

    // Update time range
    setTimeRange([
      new Date(commits[commits.length - 1].author.date),
      new Date(commits[0].author.date)
    ]);

  }, [commits, contributors, onCommitSelect]);

  return (
    <div className="relative bg-white rounded-xl shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Git History</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.5, 5))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ZoomIn className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ZoomOut className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => {
              if (svgRef.current) {
                d3.select(svgRef.current)
                  .transition()
                  .duration(750)
                  .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
                setZoom(1);
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-1" />
          <span>
            {timeRange[0].toLocaleDateString()} - {timeRange[1].toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center">
          <GitCommit className="w-4 h-4 mr-1" />
          <span>{commits.length} commits</span>
        </div>
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-1" />
          <span>{contributors.length} contributors</span>
        </div>
      </div>

      <div className="relative w-full h-[500px]">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {selectedCommit && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Selected Commit</h4>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">Message:</span> {selectedCommit.message}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Author:</span> {selectedCommit.author.name}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Date:</span>{' '}
              {new Date(selectedCommit.author.date).toLocaleString()}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">SHA:</span> {selectedCommit.sha.substring(0, 7)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHistoryVisualization; 