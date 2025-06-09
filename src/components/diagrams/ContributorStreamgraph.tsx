import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface StreamData {
  date: string;
  contributors: { [key: string]: number };
}

interface ContributorStreamgraphProps {
  data: StreamData[];
  width?: number;
  height?: number;
}

const ContributorStreamgraph = ({ data, width = 800, height = 400 }: ContributorStreamgraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Limit and validate data
    const limitedData = data.slice(0, 50); // Limit time periods
    
    // Validate data structure
    const validData = limitedData.filter(d => 
      d && 
      d.date && 
      d.contributors && 
      typeof d.contributors === 'object' &&
      Object.keys(d.contributors).length > 0
    );

    if (validData.length === 0) {
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
      
      return;
    }

    const margin = { top: 20, right: 120, bottom: 30, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Get all contributors and limit to prevent performance issues
    const allContributors = Array.from(new Set(
      validData.flatMap(d => Object.keys(d.contributors))
    )).slice(0, 10); // Limit to top 10 contributors

    if (allContributors.length === 0) {
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
        .text("No contributors found");
      
      return;
    }

    try {
      // Prepare data for stack with validation
      const stackData = validData.map(d => {
        const result: any = { 
          date: new Date(d.date),
          originalDate: d.date
        };
        
        // Validate date
        if (isNaN(result.date.getTime())) {
          result.date = new Date();
        }
        
        allContributors.forEach(contributor => {
          const value = d.contributors[contributor] || 0;
          // Ensure finite positive values
          result[contributor] = Math.max(0, Math.min(1000, isFinite(value) ? value : 0));
        });
        return result;
      });

      // Sort by date to prevent rendering issues
      stackData.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Create stack with validation
      const stack = d3.stack<any>()
        .keys(allContributors)
        .offset(d3.stackOffsetWiggle)
        .order(d3.stackOrderInsideOut);

      const series = stack(stackData);

      // Validate series data
      const validSeries = series.filter(s => 
        s && s.length > 0 && s.every(d => 
          Array.isArray(d) && 
          d.length >= 2 && 
          isFinite(d[0]) && 
          isFinite(d[1])
        )
      );

      if (validSeries.length === 0) {
        throw new Error('No valid series data');
      }

      // Calculate scales with bounds checking
      const xExtent = d3.extent(stackData, d => d.date) as [Date, Date];
      const yExtent = d3.extent(validSeries.flat(2).filter(isFinite)) as [number, number];

      if (!xExtent[0] || !xExtent[1] || !isFinite(yExtent[0]) || !isFinite(yExtent[1])) {
        throw new Error('Invalid data extents');
      }

      const xScale = d3.scaleTime()
        .domain(xExtent)
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain(yExtent)
        .range([innerHeight, 0]);

      const color = d3.scaleOrdinal(d3.schemeCategory10);

      // Area generator with curve smoothing
      const area = d3.area<any>()
        .x(d => {
          const x = xScale(d.data.date);
          return isFinite(x) ? x : 0;
        })
        .y0(d => {
          const y = yScale(d[0]);
          return isFinite(y) ? Math.max(0, Math.min(innerHeight, y)) : innerHeight;
        })
        .y1(d => {
          const y = yScale(d[1]);
          return isFinite(y) ? Math.max(0, Math.min(innerHeight, y)) : innerHeight;
        })
        .curve(d3.curveBasis);

      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Add areas with error handling
      g.selectAll("path")
        .data(validSeries)
        .enter().append("path")
        .attr("d", d => {
          try {
            return area(d);
          } catch (error) {
            console.warn('Error rendering area:', error);
            return null;
          }
        })
        .style("fill", (d, i) => color(i.toString()))
        .style("opacity", 0.8)
        .style("stroke", "white")
        .style("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
          d3.select(this).style("opacity", 1);
          
          if (d && d.key) {
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

            const totalContributions = d3.sum(d, (layer: any) => {
              const value = layer.data[d.key];
              return isFinite(value) ? value : 0;
            });

            tooltip.html(`
              <strong>${d.key}</strong><br/>
              Total contributions in period: ${totalContributions}
            `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
          }
        })
        .on("mouseout", function() {
          d3.select(this).style("opacity", 0.8);
          d3.selectAll(".tooltip").remove();
        });

      // Add x-axis with validation
      if (stackData.length > 1) {
        g.append("g")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(d3.axisBottom(xScale)
            .tickFormat(d3.timeFormat("%b %Y") as any)
            .ticks(Math.min(6, stackData.length)));
      }

      // Add legend with bounds checking
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 100}, 30)`);

      const legendItems = allContributors.slice(0, 8); // Limit legend items

      legend.selectAll("rect")
        .data(legendItems)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 18)
        .attr("width", 12)
        .attr("height", 12)
        .style("fill", (d, i) => color(i.toString()));

      legend.selectAll("text")
        .data(legendItems)
        .enter().append("text")
        .attr("x", 16)
        .attr("y", (d, i) => i * 18 + 9)
        .style("font-size", "10px")
        .style("fill", "#333")
        .text(d => d.length > 12 ? d.substring(0, 12) + '...' : d);

    } catch (error) {
      console.error('Error creating streamgraph:', error);
      
      // Fallback visualization
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
        .text("Unable to render contributor streamgraph");
    }

  }, [data, width, height]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef}></svg>
      <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
        <p>Streamgraph showing contributor activity over time. 
        The flowing streams represent each contributor's commit volume, 
        revealing team evolution and activity patterns.</p>
      </div>
    </div>
  );
};

export default ContributorStreamgraph;