import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './DependencyGraph.css';

interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: string[];
  additions: number;
  deletions: number;
}

export interface DependencyNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  size: number;
  cluster?: string;
  gitHistory?: GitCommit[];
  metrics?: {
    complexity: number;
    dependencies: number;
    dependents: number;
    lastModified: string;
    linesOfCode?: number;
    testCoverage?: number;
    bugCount?: number;
    technicalDebt?: number;
    performanceScore?: number;
    securityScore?: number;
    maintainabilityScore?: number;
    commitFrequency?: number;
    contributors?: string[];
    cyclomaticComplexity?: number;
    cognitiveComplexity?: number;
    duplication?: number;
    codeSmells?: number;
    vulnerabilities?: number;
    hotspots?: number;
    reliability?: number;
    maintainability?: number;
    security?: number;
    coverage?: number;
    duplications?: number;
    issues?: number;
    debt?: number;
    effort?: number;
    commitCount?: number;
    lastCommit?: string;
    branchCount?: number;
    mergeCount?: number;
    conflictCount?: number;
  };
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface DependencyLink extends d3.SimulationLinkDatum<DependencyNode> {
  source: DependencyNode;
  target: DependencyNode;
  type: string;
  strength: number;
  name?: string;
  version?: string;
  vulnerabilities?: number;
  metrics?: {
    frequency?: number;
    lastUsed?: string;
    dataVolume?: number;
    latency?: number;
    reliability?: number;
    security?: number;
    complexity?: number;
    coupling?: number;
    cohesion?: number;
    stability?: number;
    volatility?: number;
    risk?: number;
    impact?: number;
    criticality?: number;
  };
}

interface DependencyGraphProps {
  nodes: DependencyNode[];
  links: DependencyLink[];
}

export const DependencyGraph = ({ nodes, links }: DependencyGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) {
        return;
      }
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    // Guard against invalid data in the useEffect
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0 || !nodes || !links || nodes.length === 0 || links.length === 0) return;

    const { width, height } = dimensions;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const innerWidth = width - 40;
    const innerHeight = height - 40;

    // Create main group with margins
    const g = svg.append("g")
      .attr("transform", `translate(20, 20)`);

    // Create color scale for node types
    const color = d3.scaleOrdinal<string>()
      .domain(['frontend', 'backend', 'service', 'storage', 'dependency', 'unknown'])
      .range(['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#6B7280', '#9CA3AF']);

    // Create force simulation
    const simulation = d3.forceSimulation<DependencyNode>(nodes)
      .force("link", d3.forceLink<DependencyNode, DependencyLink>(links)
        .id(d => d.id)
        .distance(d => {
          if (d.source.type === 'dependency' || d.target.type === 'dependency') {
            return 150;
          }
          return 200;
        })
        .strength(d => {
          if (d.source.type === 'dependency' || d.target.type === 'dependency') {
            return 0.3;
          }
          return 0.5;
        }))
      .force("charge", d3.forceManyBody<DependencyNode>().strength(d => {
        if (d.type === 'dependency') {
          return -100;
        }
        return -300;
      }))
      .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force("collision", d3.forceCollide<DependencyNode>().radius(d => {
        return Math.sqrt(d.size) * 5 + 20;
      }));

    // Create links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, DependencyLink>("line")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", d => color(d.source.type || 'unknown'))
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", d => Math.sqrt(d.strength) * 2);

    // Add link interactions
    link.on("mouseover", function(event: MouseEvent, d: DependencyLink) {
      d3.select(this)
        .attr("stroke-opacity", 0.8)
        .attr("stroke-width", Math.sqrt(d.strength) * 3);

      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

      tooltip.transition()
        .duration(200)
        .style("opacity", 1);

      tooltip.html(`
        <div><strong>${d.source.name}</strong> → <strong>${d.target.name}</strong></div>
        <div>Type: ${d.type}</div>
        <div>Strength: ${d.strength}</div>
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(_event: MouseEvent, d: DependencyLink) {
      d3.select(this)
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", Math.sqrt(d.strength) * 2);

      d3.selectAll(".tooltip").remove();
    });

    // Create nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, DependencyNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(d3.drag<SVGGElement, DependencyNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add circles to nodes
    const circles = node.append("circle")
      .attr("r", d => Math.sqrt(d.size) * 5 + 10)
      .attr("fill", d => color(d.type || 'unknown'))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer");

    // Add node interactions
    circles.on("mouseover", function(event: MouseEvent, d: DependencyNode) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("stroke-width", 3)
        .attr("r", Math.sqrt(d.size) * 5 + 12);

      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

      tooltip.transition()
        .duration(200)
        .style("opacity", 1);

      tooltip.html(`
        <div><strong>${d.name}</strong></div>
        <div>Type: ${d.type}</div>
        <div>Size: ${d.size} bytes</div>
        ${d.metrics ? `
          <div>Complexity: ${d.metrics.complexity}%</div>
          <div>Dependencies: ${d.metrics.dependencies}</div>
        ` : ''}
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(_event: MouseEvent, d: DependencyNode) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("stroke-width", 2)
        .attr("r", Math.sqrt(d.size) * 5 + 10);

      d3.selectAll(".tooltip").remove();
    })
    .on("click", function(_event: MouseEvent, d: DependencyNode) {
      setSelectedNode(d);
      const connectedNodes = new Set([d.id]);
      links.forEach(link => {
        if (link.source.id === d.id) connectedNodes.add(link.target.id);
        if (link.target.id === d.id) connectedNodes.add(link.source.id);
      });
      
      node.selectAll("circle")
        .transition()
        .duration(200)
        .attr("opacity", n => connectedNodes.has((n as DependencyNode).id) ? 1 : 0.6);
      
      link
        .transition()
        .duration(200)
        .attr("opacity", l => 
          connectedNodes.has((l.source as DependencyNode).id) && connectedNodes.has((l.target as DependencyNode).id) ? 0.8 : 0.3);
    });

    // Add labels to nodes
    node.append("text")
      .text(d => d.name)
      .attr("x", 8)
      .attr("y", "0.31em")
      .attr("font-size", d => d.type === 'dependency' ? "11px" : "12px")
      .attr("fill", "#2d3748")
      .attr("font-weight", d => d.type === 'dependency' ? "400" : "500");

    // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as DependencyNode).x!)
        .attr("y1", d => (d.source as DependencyNode).y!)
        .attr("x2", d => (d.target as DependencyNode).x!)
        .attr("y2", d => (d.target as DependencyNode).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 150}, 20)`);

    const nodeTypes = Array.from(new Set(nodes.map(n => n.type))).filter(Boolean) as string[];
    nodeTypes.forEach((type, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 24})`)
        .style("cursor", "pointer")
        .on("mouseover", function() {
          node.selectAll("circle")
            .transition()
            .duration(200)
            .attr("opacity", d => ((d as DependencyNode).type || 'unknown') === type ? 1 : 0.1);
        })
        .on("mouseout", function() {
          node.selectAll("circle")
            .transition()
            .duration(200)
            .attr("opacity", 1);
        });

      legendRow.append("circle")
        .attr("r", 6)
        .attr("fill", color(type));

      legendRow.append("text")
        .attr("x", 12)
        .attr("y", 4)
        .text(type.charAt(0).toUpperCase() + type.slice(1))
        .style("font-size", "12px");
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, DependencyNode, DependencyNode>, d: DependencyNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, DependencyNode, DependencyNode>, d: DependencyNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, DependencyNode, DependencyNode>, d: DependencyNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, dimensions]);

  // Guard against empty or invalid data
  if (!nodes || !links || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">No Dependency Graph Available</div>
          <div className="text-gray-400 text-sm">
            No internal imports detected or analysis incomplete
          </div>
        </div>
      </div>
    );
  }

  // Guard against empty links (which crashes the visualization)
  if (links.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">No Dependencies Found</div>
          <div className="text-gray-400 text-sm">
            Files analyzed: {nodes.length}, but no internal imports detected
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="dependency-graph-container">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
      {selectedNode && (
        <div className="node-details">
          <h3>{selectedNode.name}</h3>
          <div className="metrics">
            <div className="metric">
              <span className="label">Type:</span>
              <span className="value">{selectedNode.type}</span>
            </div>
            <div className="metric">
              <span className="label">Size:</span>
              <span className="value">{selectedNode.size} bytes</span>
            </div>
            {selectedNode.metrics && (
              <>
                <div className="metric">
                  <span className="label">Complexity:</span>
                  <span className="value">{selectedNode.metrics.complexity}%</span>
                </div>
                <div className="metric">
                  <span className="label">Dependencies:</span>
                  <span className="value">{selectedNode.metrics.dependencies}</span>
                </div>
                <div className="metric">
                  <span className="label">Dependents:</span>
                  <span className="value">{selectedNode.metrics.dependents}</span>
                </div>
                <div className="metric">
                  <span className="label">Last Modified:</span>
                  <span className="value">{selectedNode.metrics.lastModified}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DependencyGraph;
