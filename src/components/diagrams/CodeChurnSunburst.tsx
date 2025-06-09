import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface ChurnNode {
  name: string;
  path: string;
  churnRate: number;
  children?: ChurnNode[];
  type: 'directory' | 'file';
}

interface CodeChurnSunburstProps {
  data: ChurnNode;
  width?: number;
  height?: number;
}

const CodeChurnSunburst = ({ data, width = 600, height = 600 }: CodeChurnSunburstProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const radius = Math.min(width, height) / 2 - 10;

    try {
      // Validate and limit data depth to prevent infinite recursion
      const validateAndLimitData = (node: ChurnNode, depth = 0, maxDepth = 4): ChurnNode => {
        if (depth >= maxDepth) {
          return {
            ...node,
            children: undefined
          };
        }

        const validatedNode: ChurnNode = {
          name: node.name || 'unnamed',
          path: node.path || '',
          churnRate: isFinite(node.churnRate) ? Math.max(0, Math.min(100, node.churnRate)) : 0,
          type: node.type || 'file'
        };

        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          // Limit children to prevent performance issues
          validatedNode.children = node.children
            .slice(0, 20)
            .map(child => validateAndLimitData(child, depth + 1, maxDepth))
            .filter(child => child.name && child.name.length > 0);
        }

        return validatedNode;
      };

      const validatedData = validateAndLimitData(data);

      // Create hierarchy with validation
      const root = d3.hierarchy(validatedData)
        .sum(d => d.type === 'file' ? Math.max(1, d.churnRate) : 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      if (!root || !root.descendants || root.descendants().length === 0) {
        throw new Error('No valid hierarchy data');
      }

      // Create partition layout with bounds
      const partition = d3.partition<ChurnNode>()
        .size([2 * Math.PI, radius])
        .padding(0.01);

      partition(root);

      // Validate partition results
      const descendants = root.descendants().filter(d => 
        d && 
        typeof d.x0 === 'number' && 
        typeof d.x1 === 'number' && 
        typeof d.y0 === 'number' && 
        typeof d.y1 === 'number' &&
        isFinite(d.x0) && isFinite(d.x1) && isFinite(d.y0) && isFinite(d.y1) &&
        d.x1 > d.x0 && d.y1 > d.y0
      );

      if (descendants.length === 0) {
        throw new Error('No valid partition data');
      }

      // Color scale based on churn rate with bounds
      const maxChurn = Math.max(1, d3.max(descendants, d => d.data.churnRate) || 1);
      const color = d3.scaleSequential(d3.interpolateReds)
        .domain([0, maxChurn]);

      // Arc generator with validation
      const arc = d3.arc<any>()
        .startAngle(d => Math.max(0, Math.min(2 * Math.PI, d.x0)))
        .endAngle(d => Math.max(0, Math.min(2 * Math.PI, d.x1)))
        .innerRadius(d => Math.max(0, Math.min(radius, d.y0)))
        .outerRadius(d => Math.max(0, Math.min(radius, d.y1)));

      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      // Add paths with error handling
      g.selectAll("path")
        .data(descendants)
        .enter().append("path")
        .attr("d", d => {
          try {
            return arc(d);
          } catch (error) {
            console.warn('Error rendering arc:', error);
            return null;
          }
        })
        .style("fill", d => color(d.data.churnRate))
        .style("stroke", "#fff")
        .style("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this)
            .style("stroke", "#333")
            .style("stroke-width", 2);

          if (d && d.data) {
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

            tooltip.html(`
              <strong>${d.data.name}</strong><br/>
              Path: ${d.data.path}<br/>
              Churn Rate: ${d.data.churnRate.toFixed(2)}<br/>
              Type: ${d.data.type}
            `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
          }
        })
        .on("mouseout", function() {
          d3.select(this)
            .style("stroke", "#fff")
            .style("stroke-width", 1);
          d3.selectAll(".tooltip").remove();
        });

      // Add labels for larger segments with bounds checking
      const labelData = descendants.filter(d => {
        if (!d || typeof d.x0 !== 'number' || typeof d.x1 !== 'number') return false;
        const arcLength = (d.x1 - d.x0) * (d.y0 + d.y1) / 2;
        return d.depth > 0 && arcLength > 30 && d.data.name;
      });

      g.selectAll("text")
        .data(labelData)
        .enter().append("text")
        .attr("transform", function(d: any) {
          try {
            const angle = (d.x0 + d.x1) / 2;
            const radius = (d.y0 + d.y1) / 2;
            const rotation = angle * 180 / Math.PI - 90;
            const finalRotation = angle > Math.PI ? rotation + 180 : rotation;
            return `rotate(${finalRotation}) translate(${radius},0) rotate(${angle > Math.PI ? 180 : 0})`;
          } catch (error) {
            return "translate(0,0)";
          }
        })
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "white")
        .style("font-weight", "bold")
        .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)")
        .text(d => {
          const name = d.data.name;
          return name.length > 12 ? name.substring(0, 12) + '...' : name;
        });

      // Add center label
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text("Code Churn");

      // Add legend with validation
      const legendData = [
        { label: 'Low Churn', color: color(maxChurn * 0.2) },
        { label: 'Medium Churn', color: color(maxChurn * 0.5) },
        { label: 'High Churn', color: color(maxChurn * 0.8) },
        { label: 'Very High Churn', color: color(maxChurn) }
      ].filter(item => item.color);

      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(20, 20)`);

      legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 15)
        .attr("height", 15)
        .style("fill", d => d.color);

      legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 20 + 12)
        .style("font-size", "12px")
        .style("fill", "#333")
        .text(d => d.label);

    } catch (error) {
      console.error('Error creating sunburst chart:', error);
      
      // Fallback visualization
      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("Unable to render code churn sunburst");
    }

  }, [data, width, height]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef}></svg>
      <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
        <p>Sunburst chart showing code churn rates across the repository structure. 
        Inner rings represent directories, outer rings represent files. 
        Color intensity indicates churn frequency.</p>
      </div>
    </div>
  );
};

export default CodeChurnSunburst;