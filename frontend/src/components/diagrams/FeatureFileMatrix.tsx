// frontend/src/components/diagrams/FeatureFileMatrix.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { FeatureFileMatrixItem } from '../../types/advanced';
import ErrorDisplay from '../ui/ErrorDisplay';
import VisualizationErrorBoundary from '../VisualizationErrorBoundary';

interface Props {
  data: FeatureFileMatrixItem[];
  width?: number;
  height?: number;
}

const FeatureFileMatrix: React.FC<Props> = ({ data, width = 1000, height = 700 }) => {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!data || data.length === 0 || !ref.current) {
      console.log('[FeatureFileMatrix] No data available:', { data, length: data?.length });
      return;
    }

    console.log('[FeatureFileMatrix] Rendering with data:', data);

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    // Prepare data
    const features = data.map(d => d.featureFile);
    const allFiles = Array.from(new Set(data.flatMap(d => d.sourceFiles)))
      .sort((a, b) => {
        // Sort files by feature association count for better grouping
        const aCount = data.filter(d => d.sourceFiles.includes(a)).length;
        const bCount = data.filter(d => d.sourceFiles.includes(b)).length;
        return bCount - aCount;
      })
      .slice(0, 50); // Increased from 30 to 50 for better visualization
    
    console.log(`[FeatureFileMatrix] Processing ${features.length} features and ${allFiles.length} files`);
    
    // Create matrix data structure
    const matrixData: { feature: string; file: string; value: number }[] = [];
    data.forEach((item) => {
      item.sourceFiles.forEach(file => {
        if (allFiles.includes(file)) {
          matrixData.push({ 
            feature: item.featureFile, 
            file: file, 
            value: 1
          });
        }
      });
    });

    console.log(`[FeatureFileMatrix] Created ${matrixData.length} matrix cells`);

    // Set up dimensions
    const margin = { top: 100, right: 50, bottom: 200, left: 250 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main container
    const container = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create scales
    const xScale = d3.scaleBand()
      .domain(allFiles)
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleBand()
      .domain(features)
      .range([0, innerHeight])
      .padding(0.1);

    // Color scale for features
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(features);

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-color-primary)')
      .text('Feature-to-File Mapping Matrix');

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'feature-matrix-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', 'white')
      .style('padding', '10px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.1)');

    // Add cells
    container.selectAll('.cell')
      .data(matrixData)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(d.file)!)
      .attr('y', d => yScale(d.feature)!)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .style('fill', d => colorScale(d.feature) as string)
      .style('opacity', 0.7)
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .style('cursor', 'pointer')      .on('mouseover', function(_event: MouseEvent, d: { feature: string; file: string; value: number }) {
        d3.select(this).style('opacity', 1).style('stroke-width', 2);
        tooltip.style('visibility', 'visible')
          .html(`
            <div style="font-weight: bold; margin-bottom: 5px;">${d.feature}</div>
            <div><strong>File:</strong> ${d.file.split('/').pop()}</div>
            <div><strong>Path:</strong> ${d.file}</div>
          `);
      })
      .on('mousemove', function(event: MouseEvent) {
        tooltip.style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).style('opacity', 0.7).style('stroke-width', 1);
        tooltip.style('visibility', 'hidden');
      });    // Add Y axis (features)
    container.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('fill', 'var(--text-color-secondary)')
      .style('font-size', '10px')
      .style('font-weight', '500')
      .text(function(d) { 
        const text = d as string;
        return text.length > 25 ? text.substring(0, 25) + '...' : text;
      }); // Truncate long feature names

    // Add X axis (files) - rotated labels
    container.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .style('fill', 'var(--text-color-secondary)')
      .style('font-size', '9px')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    // Add axis labels
    container.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 20)
      .attr('x', 0 - (innerHeight / 2))
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-color-secondary)')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Features');

    container.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-color-secondary)')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Source Files');

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 200}, 60)`);

    const legendItems = legend.selectAll('.legend-item')
      .data(features.slice(0, 8)) // Show only first 8 features in legend
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_d: string, i: number) => `translate(0, ${i * 20})`);

    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .style('fill', d => colorScale(d) as string)
      .style('opacity', 0.7);

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('fill', 'var(--text-color-secondary)')
      .style('font-size', '11px')
      .text(d => d.length > 20 ? d.substring(0, 20) + '...' : d);

    // Cleanup tooltip on unmount
    return () => {
      d3.select('.feature-matrix-tooltip').remove();
    };

  }, [data, width, height]);

  if (!data || data.length === 0) {
    return (
      <ErrorDisplay 
        title="No feature matrix data available" 
        message="Please ensure the analysis has sufficient data for this visualization."
      />
    );
  }

  return (
    <VisualizationErrorBoundary>
      <div className="feature-file-matrix">
        <svg ref={ref} />
      </div>
    </VisualizationErrorBoundary>
  );
};

export default FeatureFileMatrix;
