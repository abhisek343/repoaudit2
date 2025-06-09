import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

interface StreamData {
  date: string;
  contributors: { [key: string]: number };
}

interface ProcessedData {
  dates: Date[];
  contributors: string[];
  values: number[][];
}

interface ContributorStreamgraphProps {
  data: StreamData[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  colors?: string[];
  maxTimePoints?: number;
}

const ContributorStreamgraph: React.FC<ContributorStreamgraphProps> = ({ 
  data,
  width = 800,
  height = 400,
  margin = { top: 20, right: 30, bottom: 30, left: 40 },
  colors = d3.schemeCategory10,
  maxTimePoints = 50
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Process and validate data
  const processedData = useMemo((): ProcessedData | null => {
    if (!data.length) return null;

    try {
      // Limit and validate time periods
      const validData = data
        .slice(0, maxTimePoints)
        .filter(d => 
          d && 
          d.date && 
          d.contributors && 
          typeof d.contributors === 'object' &&
          Object.keys(d.contributors).length > 0
        );

      if (validData.length === 0) return null;

      // Convert dates to Date objects
      const dates = validData.map(d => new Date(d.date));
      
      // Get unique contributors
      const contributors = Array.from(new Set(
        validData.flatMap(d => Object.keys(d.contributors))
      )).sort();

      // Create matrix of values
      const values = validData.map(d => 
        contributors.map(c => d.contributors[c] || 0)
      );

      return { dates, contributors, values };
    } catch (error) {
      console.error('Error processing contributor data:', error);
      return null;
    }
  }, [data, maxTimePoints]);

  useEffect(() => {
    if (!svgRef.current || !processedData) {
      // Handle empty/invalid data state
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      
      if (svgRef.current) {
        const g = svg
          .attr("width", width)
          .attr("height", height)
          .append("g");

        g.append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .style("fill", "#666")
          .text("No valid contributor data");
      }
      return;
    }

    const { dates, contributors, values } = processedData;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleTime()
      .domain(d3.extent(dates) as [Date, Date])
      .range([0, innerWidth]);

    const color = d3.scaleOrdinal<string>()
      .domain(contributors)
      .range(colors);

    // Define a type for the data points in the stack
    type StackDataPoint = { date: Date; [key: string]: number | Date };

    // Restructure data for D3's stack layout
    const dataForStack: StackDataPoint[] = dates.map((date, i) => {
      const datum: StackDataPoint = { date };
      contributors.forEach((c, j) => {
        datum[c] = values[i][j];
      });
      return datum;
    });

    // Create the stack layout
    const stack = d3.stack<StackDataPoint, string>()
      .keys(contributors)
      .offset(d3.stackOffsetWiggle)
      .order(d3.stackOrderInsideOut);

    const stackedData = stack(dataForStack);

    // Adjust Y scale to fit the stacked data
    const y = d3.scaleLinear()
      .domain([
        d3.min(stackedData, s => d3.min(s, d => d[0])) || 0,
        d3.max(stackedData, s => d3.max(s, d => d[1])) || 0,
      ])
      .range([innerHeight, 0]);

    // Create areas generator
    const area = d3.area<d3.SeriesPoint<StackDataPoint>>()
      .x(d => x(d.data.date))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis);

    // Draw the streams
    g.selectAll<SVGPathElement, d3.Series<StackDataPoint, string>>(".stream")
      .data(stackedData)
      .enter()
      .append("path")
      .attr("class", "stream")
      .attr("d", area)
      .attr("fill", d => color(d.key))
      .attr("opacity", 0.8)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("opacity", 1);

        // Show tooltip
        const total = d3.sum(
          values[values.length - 1].filter((_, i) => 
            contributors[i] === d.key
          )
        );

        const tooltip = d3.select("#contributor-tooltip");
        tooltip
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`
            <div class="p-2 bg-white rounded shadow-lg">
              <p class="font-medium">${d.key}</p>
              <p class="text-sm mt-1">
                Recent contributions: <span class="font-medium">${total}</span>
              </p>
            </div>
          `);
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("opacity", 0.8);

        d3.select("#contributor-tooltip")
          .style("visibility", "hidden");
      });

    // Add axes
    const xAxis = g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    // Style axes
    xAxis.select(".domain").attr("stroke", "#666");
    xAxis.selectAll(".tick line").attr("stroke", "#666");
    xAxis.selectAll(".tick text")
      .attr("fill", "#666")
      .attr("font-size", "10px");

  }, [processedData, width, height, margin, colors]);

  return (
    <div className="relative">
      <div className="bg-white rounded-xl p-4 shadow-lg">
        <svg ref={svgRef} className="w-full h-full" />
        <div 
          id="contributor-tooltip" 
          style={{ 
            position: 'absolute',
            visibility: 'hidden',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        />
        <p className="text-sm text-gray-600 text-center mt-4">
          Hover over streams to see contributor details.
          Width represents relative contribution volume.
        </p>
      </div>
    </div>
  );
};

export type { StreamData, ContributorStreamgraphProps };
export default ContributorStreamgraph;
