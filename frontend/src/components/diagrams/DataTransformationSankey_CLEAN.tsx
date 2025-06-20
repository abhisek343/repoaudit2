// frontend/src/components/diagrams/DataTransformationSankey.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import type { SankeyData } from '../../types/advanced';
import VisualizationErrorBoundary from '../VisualizationErrorBoundary';

interface Props {
  data?: SankeyData;
  width?: number;
  height?: number;
  colors?: string[];
}

const DataTransformationSankey: React.FC<Props> = ({ 
  data, 
  width: propWidth = 800, 
  height: propHeight = 400,
  colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16']
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Generate realistic sample data
  const generateSampleData = useCallback((): SankeyData => {
    return {
      nodes: [
        { id: "Raw Data Sources" },
        { id: "Data Ingestion" },
        { id: "Data Cleaning" },
        { id: "Feature Engineering" },
        { id: "Data Validation" },
        { id: "Model Training" },
        { id: "Model Validation" },
        { id: "Production Pipeline" },
        { id: "Monitoring & Alerts" },
        { id: "Business Intelligence" }
      ],
      links: [
        { source: "Raw Data Sources", target: "Data Ingestion", value: 10000 },
        { source: "Data Ingestion", target: "Data Cleaning", value: 9500 },
        { source: "Data Cleaning", target: "Feature Engineering", value: 8800 },
        { source: "Data Cleaning", target: "Data Validation", value: 1200 },
        { source: "Feature Engineering", target: "Model Training", value: 7500 },
        { source: "Feature Engineering", target: "Business Intelligence", value: 1300 },
        { source: "Data Validation", target: "Model Training", value: 800 },
        { source: "Model Training", target: "Model Validation", value: 8000 },
        { source: "Model Validation", target: "Production Pipeline", value: 6500 },
        { source: "Model Validation", target: "Model Training", value: 1500 },
        { source: "Production Pipeline", target: "Monitoring & Alerts", value: 6000 },
        { source: "Production Pipeline", target: "Business Intelligence", value: 500 }
      ]
    };
  }, []);

  const renderSankey = useCallback(() => {
    if (!svgRef.current) return;

    const currentData = (data && data.nodes && data.nodes.length > 0) ? data : generateSampleData();
    
    if (!currentData?.nodes?.length || !currentData?.links?.length) return;

    // Clear previous render
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Get dimensions
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || propWidth;
    const height = rect.height || propHeight;

    const margin = { top: 20, right: 120, bottom: 40, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create color scale
    const colorScale = d3.scaleOrdinal()
      .domain(currentData.nodes.map(d => d.id))
      .range(colors);

    // Configure sankey - use any to work around complex d3-sankey typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sankeyGenerator: any = sankey()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .nodeId((d: any) => d.id)
      .nodeWidth(18)
      .nodePadding(12)
      .extent([[margin.left, margin.top], [innerWidth, innerHeight]]);

    try {
      // Create the graph
      const graph = sankeyGenerator({
        nodes: currentData.nodes.map(d => ({ ...d })),
        links: currentData.links.map(d => ({ ...d }))
      });

      // Create container group
      const container = svg.append("g");

      // Create gradients for links
      const defs = svg.append("defs");
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      graph.links.forEach((link: any, i: number) => {
        const gradient = defs.append("linearGradient")
          .attr("id", `sankey-gradient-${i}`)
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", link.source?.x1 || 0)
          .attr("x2", link.target?.x0 || 0);

        gradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", colorScale(link.source?.id || '') as string)
          .attr("stop-opacity", 0.7);

        gradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", colorScale(link.target?.id || '') as string)
          .attr("stop-opacity", 0.7);
      });

      // Render links
      const links = container.append("g")
        .attr("class", "sankey-links")
        .selectAll("path")
        .data(graph.links)
        .join("path")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("d", (d: any) => sankeyLinkHorizontal()(d))
        .attr("stroke", (_d, i) => `url(#sankey-gradient-${i})`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("stroke-width", (d: any) => Math.max(1, d.width || 0))
        .attr("fill", "none")
        .attr("stroke-opacity", 0.6)
        .style("cursor", "pointer")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("mouseover", function(event, d: any) {
          d3.select(this)
            .attr("stroke-opacity", 0.9)
            .attr("stroke-width", Math.max(2, (d.width || 0) + 1));
          
          const [mouseX, mouseY] = d3.pointer(event, document.body);
          setTooltip({
            x: mouseX,
            y: mouseY,
            content: `${d.source?.id || 'Unknown'} → ${d.target?.id || 'Unknown'}: ${d.value.toLocaleString()}`
          });
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("mouseout", function(_event, d: any) {
          d3.select(this)
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", Math.max(1, d.width || 0));
          
          setTooltip(null);
        });

      // Render nodes
      const nodes = container.append("g")
        .attr("class", "sankey-nodes")
        .selectAll("g")
        .data(graph.nodes)
        .join("g")
        .attr("class", "sankey-node")
        .style("cursor", "pointer");

      // Node rectangles
      nodes.append("rect")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("x", (d: any) => d.x0 || 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("y", (d: any) => d.y0 || 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("height", (d: any) => (d.y1 || 0) - (d.y0 || 0))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("width", (d: any) => (d.x1 || 0) - (d.x0 || 0))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("fill", (d: any) => colorScale(d.id) as string)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("rx", 3)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("mouseover", function(event, d: any) {
          d3.select(this)
            .attr("stroke", "#333")
            .attr("stroke-width", 2);
          
          setHoveredNode(d.id);
          
          // Highlight connected links
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          links.attr("stroke-opacity", (link: any) => {
            return (link.source?.id === d.id || link.target?.id === d.id) ? 0.9 : 0.2;
          });
          
          const [mouseX, mouseY] = d3.pointer(event, document.body);
          setTooltip({
            x: mouseX,
            y: mouseY,
            content: `${d.id}: ${d.value?.toLocaleString() || 'N/A'}`
          });
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("mouseout", function() {
          d3.select(this)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);
          
          setHoveredNode(null);
          
          // Reset link opacity
          links.attr("stroke-opacity", 0.6);
          setTooltip(null);
        });

      // Node labels
      nodes.append("text")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("x", (d: any) => (d.x0 || 0) < innerWidth / 2 ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("y", (d: any) => ((d.y1 || 0) + (d.y0 || 0)) / 2)
        .attr("dy", "0.35em")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("text-anchor", (d: any) => (d.x0 || 0) < innerWidth / 2 ? "start" : "end")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .text((d: any) => d.id)
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("fill", "#374151")
        .style("pointer-events", "none");

      // Node value labels
      nodes.append("text")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("x", (d: any) => ((d.x0 || 0) + (d.x1 || 0)) / 2)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("y", (d: any) => (d.y1 || 0) + 12)
        .attr("text-anchor", "middle")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .text((d: any) => d.value ? d.value.toLocaleString() : '')
        .style("font-size", "10px")
        .style("fill", "#6b7280")
        .style("pointer-events", "none");

    } catch (error) {
      console.error('Error rendering Sankey diagram:', error);
    }
  }, [data, propWidth, propHeight, colors, generateSampleData]);

  useEffect(() => {
    renderSankey();
    
    // Re-render on window resize
    const handleResize = () => {
      setTimeout(renderSankey, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderSankey]);

  const isUsingFallbackData = !data || !data.nodes || data.nodes.length === 0;

  return (
    <VisualizationErrorBoundary fallbackMessage="Could not render the Sankey Diagram.">
      <div className="relative w-full h-full">
        <svg 
          ref={svgRef} 
          className="w-full h-full"
          style={{ minHeight: '300px' }}
        />
        
        {/* Tooltip */}
        {tooltip && (
          <div 
            className="absolute pointer-events-none z-50 bg-gray-900 text-white px-2 py-1 rounded text-xs"
            style={{ 
              left: tooltip.x + 10, 
              top: tooltip.y - 30,
              transform: 'translateX(-50%)'
            }}
          >
            {tooltip.content}
          </div>
        )}
        
        {/* Legend */}
        <div className="absolute top-2 right-2 bg-white bg-opacity-95 p-2 rounded-lg shadow-sm text-xs border">
          <div className="font-semibold mb-1 text-gray-700">Data Flow</div>
          <div className="flex items-center gap-1 mb-1">
            <div className="w-3 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded"></div>
            <span>Transformation</span>
          </div>
          {hoveredNode && (
            <div className="mt-1 text-indigo-600 font-medium">
              Active: {hoveredNode}
            </div>
          )}
        </div>
        
        {/* Status indicator */}
        {isUsingFallbackData && (
          <div className="absolute bottom-2 left-2 bg-blue-50 border border-blue-200 p-2 rounded text-xs text-blue-700">
            <div className="font-semibold">Demo Data</div>
            <div>Sample transformation pipeline</div>
          </div>
        )}
      </div>
    </VisualizationErrorBoundary>
  );
};

export default DataTransformationSankey;
