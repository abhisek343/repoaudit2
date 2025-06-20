// frontend/src/components/diagrams/PRLifecycleGantt.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { PullRequestData } from '../../types/advanced';
import ErrorDisplay from '../ui/ErrorDisplay';
import VisualizationErrorBoundary from '../VisualizationErrorBoundary';
import './PRLifecycleGantt.css';

interface Props {
  data: PullRequestData[];
}

interface ProcessedPRData extends PullRequestData {
  createdDate: Date;
  closedDate: Date;
  mergedDate?: Date;
  totalDuration: number;
  reviewDuration?: number;
  mergeWaitDuration?: number;
  phases: Array<{
    name: string;
    start: Date;
    end: Date;
    duration: number;
    color: string;
    icon: string;
  }>;
}

const PRLifecycleGantt: React.FC<Props> = ({ data }) => {
  const ref = useRef<SVGSVGElement>(null);
  const [selectedPR, setSelectedPR] = useState<ProcessedPRData | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'phases'>('phases');

  // Process PR data into phases
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(pr => {
      const createdDate = new Date(pr.createdAt);
      const closedDate = pr.closedAt ? new Date(pr.closedAt) : new Date();
      const mergedDate = pr.mergedAt ? new Date(pr.mergedAt) : undefined;
      
      const totalDuration = (closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Estimate phase durations based on PR lifecycle
      const phases = [];
      
      if (pr.state === 'merged' && mergedDate) {
        // Draft/Development phase (estimated 60% of total time)
        const developmentEnd = new Date(createdDate.getTime() + (mergedDate.getTime() - createdDate.getTime()) * 0.6);
        phases.push({
          name: 'Development',
          start: createdDate,
          end: developmentEnd,
          duration: (developmentEnd.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
          color: '#3B82F6',
          icon: '⚡'
        });
        
        // Review phase (estimated 30% of total time)
        const reviewEnd = new Date(createdDate.getTime() + (mergedDate.getTime() - createdDate.getTime()) * 0.9);
        phases.push({
          name: 'Review',
          start: developmentEnd,
          end: reviewEnd,
          duration: (reviewEnd.getTime() - developmentEnd.getTime()) / (1000 * 60 * 60 * 24),
          color: '#F59E0B',
          icon: '👁️'
        });
        
        // Merge phase (remaining 10%)
        phases.push({
          name: 'Merge',
          start: reviewEnd,
          end: mergedDate,
          duration: (mergedDate.getTime() - reviewEnd.getTime()) / (1000 * 60 * 60 * 24),
          color: '#10B981',
          icon: '✅'
        });
      } else {
        // For open or closed PRs
        const phase = pr.state === 'open' ? 'In Progress' : 'Closed';
        phases.push({
          name: phase,
          start: createdDate,
          end: closedDate,
          duration: totalDuration,
          color: pr.state === 'open' ? '#6366F1' : '#EF4444',
          icon: pr.state === 'open' ? '🔄' : '❌'
        });
      }
      
      return {
        ...pr,
        createdDate,
        closedDate,
        mergedDate,
        totalDuration,
        phases
      } as ProcessedPRData;
    }).sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime()).slice(0, 20); // Show latest 20 PRs
  }, [data]);

  useEffect(() => {
    if (!processedData.length || !ref.current) return;
    
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    
    const containerWidth = ref.current.clientWidth || 800;
    const containerHeight = ref.current.clientHeight || 600;
    
    const margin = { top: 60, right: 120, bottom: 80, left: 200 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Main container
    const container = svg
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    // Title and controls
    const header = container.append('g').attr('class', 'header');
    
    header.append('text')
      .attr('x', containerWidth / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', '#1F2937')
      .text('Pull Request Lifecycle Timeline');
      // View mode toggle
    const toggleGroup = header.append('g')
      .attr('transform', `translate(${containerWidth - 150}, 15)`);
    
    toggleGroup.append('rect')
      .attr('width', 140)
      .attr('height', 25)
      .attr('rx', 12)
      .style('fill', '#F3F4F6')
      .style('stroke', '#D1D5DB');
    
    toggleGroup.append('text')
      .attr('x', 70)
      .attr('y', 16)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#6B7280')
      .text('View: ' + (viewMode === 'phases' ? 'Phases' : 'Timeline'))
      .style('cursor', 'pointer')
      .on('click', () => {
        setViewMode(viewMode === 'phases' ? 'timeline' : 'phases');
      });

    const g = container.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const allDates = processedData.flatMap(d => [d.createdDate, d.closedDate]);
    const timeExtent = d3.extent(allDates) as [Date, Date];
    
    const x = d3.scaleTime()
      .domain(timeExtent)
      .range([0, width]);    const y = d3.scaleBand()
      .domain(processedData.map((_, i) => `PR-${i}`))
      .range([0, height])
      .padding(0.2);    // Add grid lines
    const xAxis = d3.axisBottom(x)
      .tickFormat((d) => d3.timeFormat("%m/%d")(d as Date));
    
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("line")
      .style("stroke", "#E5E7EB")
      .style("stroke-width", 1);

    // Y-axis with PR titles
    const yAxisGroup = g.append("g").attr("class", "y-axis");
    
    processedData.forEach((pr, i) => {
      const yPos = y(`PR-${i}`)! + y.bandwidth() / 2;
      
      // PR title (truncated intelligently)
      const title = pr.title.length > 25 ? pr.title.substring(0, 25) + '...' : pr.title;
      
      yAxisGroup.append('text')
        .attr('x', -10)
        .attr('y', yPos)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .style('cursor', 'pointer')
        .text(title)
        .on('click', () => setSelectedPR(pr))
        .append('title')
        .text(pr.title);
      
      // Author info
      yAxisGroup.append('text')
        .attr('x', -10)
        .attr('y', yPos + 12)
        .attr('text-anchor', 'end')
        .style('font-size', '9px')
        .style('fill', '#6B7280')
        .text(`@${pr.author}`);
    });

    // Render based on view mode
    if (viewMode === 'phases') {
      // Phase-based rendering
      processedData.forEach((pr, i) => {
        const rowY = y(`PR-${i}`)!;
        const rowHeight = y.bandwidth();
        
        pr.phases.forEach((phase, phaseIndex) => {
          const phaseX = x(phase.start);
          const phaseWidth = x(phase.end) - x(phase.start);
          
          if (phaseWidth > 0) {
            // Phase bar
            const phaseGroup = g.append('g')
              .attr('class', 'phase-bar')
              .style('cursor', 'pointer');
            
            phaseGroup.append('rect')
              .attr('x', phaseX)
              .attr('y', rowY + (phaseIndex * (rowHeight / pr.phases.length)))
              .attr('width', phaseWidth)
              .attr('height', rowHeight / pr.phases.length - 1)
              .attr('rx', 3)
              .style('fill', phase.color)
              .style('opacity', 0.8)
              .style('stroke', '#FFFFFF')
              .style('stroke-width', 1);
            
            // Phase label if wide enough
            if (phaseWidth > 40) {
              phaseGroup.append('text')
                .attr('x', phaseX + phaseWidth / 2)
                .attr('y', rowY + (phaseIndex * (rowHeight / pr.phases.length)) + (rowHeight / pr.phases.length) / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('fill', 'white')
                .style('font-weight', 'bold')
                .text(`${phase.icon} ${phase.name}`);
            }
            
            // Tooltip
            phaseGroup.append('title')
              .text(`${phase.name}\nDuration: ${phase.duration.toFixed(1)} days\nFrom: ${phase.start.toLocaleDateString()}\nTo: ${phase.end.toLocaleDateString()}`);
          }
        });
      });
    } else {
      // Timeline-based rendering
      processedData.forEach((pr, i) => {
        const rowY = y(`PR-${i}`)!;
        const rowHeight = y.bandwidth();
        
        const barX = x(pr.createdDate);
        const barWidth = x(pr.closedDate) - x(pr.createdDate);
        
        // Main bar
        const barGroup = g.append('g')
          .attr('class', 'timeline-bar')
          .style('cursor', 'pointer');
        
        const stateColor = pr.state === 'merged' ? '#10B981' : 
                          pr.state === 'open' ? '#3B82F6' : '#EF4444';
        
        barGroup.append('rect')
          .attr('x', barX)
          .attr('y', rowY)
          .attr('width', barWidth)
          .attr('height', rowHeight)
          .attr('rx', 4)
          .style('fill', stateColor)
          .style('opacity', 0.7)
          .style('stroke', '#FFFFFF')
          .style('stroke-width', 2);
        
        // Status indicator
        const statusIcon = pr.state === 'merged' ? '✅' : 
                          pr.state === 'open' ? '🔄' : '❌';
        
        barGroup.append('text')
          .attr('x', barX + 8)
          .attr('y', rowY + rowHeight / 2)
          .attr('dy', '0.35em')
          .style('font-size', '12px')
          .text(statusIcon);
        
        // Duration label
        if (barWidth > 60) {
          barGroup.append('text')
            .attr('x', barX + barWidth / 2)
            .attr('y', rowY + rowHeight / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', 'white')
            .style('font-weight', 'bold')
            .text(`${pr.totalDuration.toFixed(1)}d`);
        }
        
        // Tooltip
        barGroup.append('title')
          .text(`${pr.title}\nAuthor: ${pr.author}\nState: ${pr.state}\nDuration: ${pr.totalDuration.toFixed(1)} days\nOpened: ${pr.createdDate.toLocaleDateString()}\nClosed: ${pr.closedDate.toLocaleDateString()}`);
      });
    }

    // Legend
    const legend = container.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${containerWidth - 110}, ${margin.top + 20})`);
    
    const legendItems = viewMode === 'phases' 
      ? [
          { label: 'Development', color: '#3B82F6', icon: '⚡' },
          { label: 'Review', color: '#F59E0B', icon: '👁️' },
          { label: 'Merge', color: '#10B981', icon: '✅' },
          { label: 'Closed', color: '#EF4444', icon: '❌' }
        ]
      : [
          { label: 'Merged', color: '#10B981', icon: '✅' },
          { label: 'Open', color: '#3B82F6', icon: '🔄' },
          { label: 'Closed', color: '#EF4444', icon: '❌' }
        ];
    
    legendItems.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendItem.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .style('fill', item.color);
      
      legendItem.append('text')
        .attr('x', 18)
        .attr('y', 6)
        .attr('dy', '0.35em')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text(`${item.icon} ${item.label}`);
    });

    // Stats panel
    const stats = container.append('g')
      .attr('class', 'stats')
      .attr('transform', `translate(20, ${containerHeight - 60})`);
    
    const avgDuration = processedData.reduce((sum, pr) => sum + pr.totalDuration, 0) / processedData.length;
    const mergedCount = processedData.filter(pr => pr.state === 'merged').length;
    const mergeRate = (mergedCount / processedData.length * 100).toFixed(1);
    
    stats.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .style('font-size', '12px')
      .style('fill', '#6B7280')
      .text(`Showing ${processedData.length} PRs | Avg Duration: ${avgDuration.toFixed(1)} days | Merge Rate: ${mergeRate}%`);

  }, [processedData, viewMode]);

  if (!data || data.length === 0) {
    return <ErrorDisplay message="No Pull Request Data Available" />;
  }
  return (
    <div className="w-full h-full bg-white rounded-lg border border-gray-200 pr-lifecycle-gantt">
      <VisualizationErrorBoundary fallbackMessage="Could not render the PR Lifecycle Gantt Chart.">
        <svg ref={ref} className="w-full h-full" style={{ minHeight: '500px' }}></svg>
      </VisualizationErrorBoundary>
      
      {selectedPR && (
        <div className="absolute top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-10 pr-detail-panel">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-sm text-gray-900 leading-tight">{selectedPR.title}</h4>
            <button 
              onClick={() => setSelectedPR(null)}
              className="text-gray-400 hover:text-gray-600 ml-2 close-button"
            >
              ×
            </button>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <div><strong>Author:</strong> {selectedPR.author}</div>
            <div><strong>State:</strong> {selectedPR.state}</div>
            <div><strong>Duration:</strong> {selectedPR.totalDuration.toFixed(1)} days</div>
            <div><strong>Created:</strong> {selectedPR.createdDate.toLocaleDateString()}</div>
            {selectedPR.state !== 'open' && (
              <div><strong>Closed:</strong> {selectedPR.closedDate.toLocaleDateString()}</div>
            )}
          </div>
          {selectedPR.phases.length > 1 && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-1">Phases:</div>
              {selectedPR.phases.map((phase, i) => (
                <div key={i} className="flex items-center text-xs text-gray-600 mb-1 phase-item">
                  <span style={{ color: phase.color }}>{phase.icon}</span>
                  <span className="ml-1">{phase.name}: {phase.duration.toFixed(1)}d</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PRLifecycleGantt;
