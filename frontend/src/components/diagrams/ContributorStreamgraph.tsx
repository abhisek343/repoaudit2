import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Users2 } from 'lucide-react'; // For empty state

export interface StreamDataPoint { // Export for DiagramsPage
  date: string; // YYYY-MM-DD
  contributors: { [key: string]: number }; // contributorLogin: activityCount
}

            // Removed unused ProcessedLayerData interface

            // Define data types used in the component
            type ValuesData = { [contributor: string]: number }; // Represents contributor counts for a single date point

            // MyStackedPoint might not be strictly needed if areaGenerator works directly with d3.SeriesPoint and datesInDataOrder
            // For now, let's assume areaGenerator will be adapted.

            interface ContributorStreamgraphProps {
              data?: StreamDataPoint[]; // Make optional
  width?: number;
  height?: number;
  maxContributors?: number; // Max contributors to show to prevent clutter
}

            const ContributorStreamgraph: React.FC<ContributorStreamgraphProps> = ({ 
              data,
              width = 800,
              height = 400,
              maxContributors = 10 // Limit number of contributors displayed
            }) => {
              const svgRef = useRef<SVGSVGElement>(null);
              const [tooltipContent, setTooltipContent] = useState<string | null>(null);
              const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);

              const processedData = useMemo(() => {
                if (!data || data.length === 0) return null;

                const totalContributions: Record<string, number> = {};
                data.forEach(d => {
                  Object.entries(d.contributors).forEach(([contributor, count]) => {
                    totalContributions[contributor] = (totalContributions[contributor] || 0) + count;
                  });
                });

                const topNContributors = Object.entries(totalContributions)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, maxContributors)
                  .map(([name]) => name);
                
                if (topNContributors.length === 0) return null;

                const datesInDataOrder: Date[] = data.map(d => new Date(d.date));
                const seriesValues: ValuesData[] = data.map(d => {
                  const values: ValuesData = {};
                  let otherContributions = 0;
                  Object.entries(d.contributors).forEach(([contributor, count]) => {
                    if (topNContributors.includes(contributor)) {
                      values[contributor] = count;
                    } else {
                      otherContributions += count;
                    }
                  });
                  if (Object.keys(d.contributors).length > maxContributors && otherContributions > 0) {
                    values['Other'] = otherContributions;
                  }
                  return values;
                });
                
                const keys = [...topNContributors];
                if (seriesValues.some(v => v['Other'] > 0)) {
                    keys.push('Other');
                }
                
                const stack = d3.stack<ValuesData, string>() 
                  .keys(keys)
                  .value((d, key) => d[key] || 0)
                  .offset(d3.stackOffsetWiggle) 
                  .order(d3.stackOrderInsideOut); 

                const stackedValues = stack(seriesValues); // This is d3.Series<ValuesData, string>[]
                
                return { stackedValues, keys, datesInDataOrder };

              }, [data, maxContributors]);

              useEffect(() => {
                if (!svgRef.current) return;
                const svg = d3.select(svgRef.current);
                svg.selectAll("*").remove();

                if (!processedData || !processedData.stackedValues || processedData.stackedValues.length === 0) {
                  const g = svg.attr("width", width).attr("height", height).append("g")
                    .attr("transform", `translate(${width / 2}, ${height / 2})`);
                  g.append(() => Users2({ className: "w-16 h-16 text-gray-400" }) as unknown as Element) // Cast to Element for D3 append compatibility with JSX.Element
                    .attr('x', -32).attr('y', -50);
                  g.append("text").attr("text-anchor", "middle").attr("y", 20)
                    .style("font-size", "14px").style("fill", "#6B7280")
                    .text("No contributor activity data to display.");
                  return;
                }

                const { stackedValues, keys, datesInDataOrder } = processedData;

                const margin = { top: 20, right: 30, bottom: 50, left: 20 };
                const innerWidth = width - margin.left - margin.right;
                const innerHeight = height - margin.top - margin.bottom;

                const g = svg.attr("width", width).attr("height", height)
                  .append("g")
                  .attr("transform", `translate(${margin.left},${margin.top})`);

                const xScale = d3.scaleTime()
                  .domain(d3.extent(datesInDataOrder) as [Date, Date])
                  .range([0, innerWidth]);

                const yMin = d3.min(stackedValues, series => d3.min(series, d => d[0])) || 0;
                const yMax = d3.max(stackedValues, series => d3.max(series, d => d[1])) || 1;
                const yScale = d3.scaleLinear()
                  .domain([yMin, yMax])
                  .range([innerHeight, 0]);

                const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(keys);
                
                const areaGenerator = d3.area<d3.SeriesPoint<ValuesData>>() 
                  .x((_p, i) => xScale(datesInDataOrder[i])) // Only use index if 'p' is unused
                  .y0(p => yScale(p[0]))
                  .y1(p => yScale(p[1]))
                  .curve(d3.curveBasis); 

                g.selectAll(".layer")
                  .data(stackedValues) // Data is d3.Series<ValuesData, string>[]
                  .join("path")
                    .attr("class", "layer")
                    // d is d3.Series<ValuesData, string>, which is d3.SeriesPoint<ValuesData>[]
                    // areaGenerator expects d3.SeriesPoint<ValuesData>[]
                    .attr("d", d => areaGenerator(d)) 
                    .attr("fill", (d: d3.Series<ValuesData, string>) => colorScale(d.key)) 
                    .attr("fill-opacity", 0.85)
                    .style("stroke", (d: d3.Series<ValuesData, string>) => (d3.rgb(colorScale(d.key)).darker(0.5) || colorScale(d.key)).toString())
                    .style("stroke-width", 0.5)
                    .on("mouseover", function(event: MouseEvent, d: d3.Series<ValuesData, string>) { 
                      d3.select(this).attr("fill-opacity", 1);
                      const totalForKey = d.reduce((sum, point) => sum + (point[1] - point[0]), 0);
                      setTooltipContent(`
                        <div class="font-semibold text-sm" style="color: ${colorScale(d.key)}">${d.key}</div>
                        <div class="text-xs text-gray-300">Total Activity: ${totalForKey.toFixed(0)}</div>
                      `);
                      setTooltipPosition({ x: event.pageX, y: event.pageY });
                    })
                    .on("mouseout", function() {
                      d3.select(this).attr("fill-opacity", 0.85);
                      setTooltipContent(null);
                    });

                // Add X axis
                const timeFormat = d3.timeFormat("%b '%y");
                g.append("g")
                  .attr("transform", `translate(0,${innerHeight})`)
                  .call(d3.axisBottom(xScale).ticks(width / 100).tickSizeOuter(0).tickFormat(d => timeFormat(d as Date))) // Attempt to remove 'as any'
                  .call(axis => axis.selectAll(".tick text").style("font-size", "10px").attr("fill", "#4B5563"))
                  .call(axis => axis.select(".domain").remove());

              }, [processedData, width, height]);

  return (
    <div className="relative p-4 bg-white rounded-lg shadow border border-gray-200">
      <svg ref={svgRef} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`} />
      {tooltipContent && tooltipPosition && (
        <div
          className="absolute p-2 bg-gray-800 text-white rounded-md shadow-lg text-xs pointer-events-none"
          style={{ left: tooltipPosition.x + 10, top: tooltipPosition.y - 20, opacity: 0.95, zIndex: 1000 }}
          dangerouslySetInnerHTML={{ __html: tooltipContent }}
        />
      )}
       <div className="mt-3 text-xs text-gray-500 text-center max-w-md mx-auto">
        <p>Streamgraph showing contributor activity over time. Layer thickness represents activity volume. Hover for details.</p>
      </div>
    </div>
  );
};

export default ContributorStreamgraph;
