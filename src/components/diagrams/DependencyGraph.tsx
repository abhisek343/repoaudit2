import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Search, Filter, ZoomIn, ZoomOut, RefreshCw, Info, BarChart2, GitBranch, Clock, AlertCircle, FileText, Layers } from 'lucide-react';

interface DependencyNode {
  id: string;
  name: string;
  type: string;
  size: number;
  cluster?: string;
  metrics?: {
    complexity?: number;
    dependencies?: number;
    dependents?: number;
    lastModified?: string;
    linesOfCode?: number;
    testCoverage?: number;
    bugCount?: number;
    technicalDebt?: number;
    performanceScore?: number;
    securityScore?: number;
    maintainabilityScore?: number;
    commitFrequency?: number;
    contributors?: number;
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
  };
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface DependencyLink {
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
  width: number;
  height: number;
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({
  nodes,
  links,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['module', 'package', 'file']);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [showMetrics, setShowMetrics] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'force' | 'hierarchical' | 'circular'>('force');
  const [viewMode, setViewMode] = useState<'standard' | 'metrics' | 'complexity' | 'security'>('standard');
  const [filterMetrics, setFilterMetrics] = useState({
    minComplexity: 0,
    maxComplexity: 100,
    minDependencies: 0,
    maxDependencies: 100,
    minSecurityScore: 0,
    maxSecurityScore: 100,
  });

  // Calculate advanced graph statistics
  const stats = {
    totalNodes: nodes.length,
    totalLinks: links.length,
    avgComplexity: d3.mean(nodes.map(n => n.metrics?.complexity || 0)) || 0,
    avgDependencies: d3.mean(nodes.map(n => n.metrics?.dependencies || 0)) || 0,
    criticalNodes: nodes.filter(n => (n.metrics?.complexity || 0) > 80).length,
    highDependencyNodes: nodes.filter(n => (n.metrics?.dependencies || 0) > 10).length,
    clusters: Array.from(new Set(nodes.map(n => n.cluster || 'default'))).length,
    securityIssues: nodes.filter(n => (n.metrics?.securityScore || 0) < 50).length,
    maintainabilityIssues: nodes.filter(n => (n.metrics?.maintainabilityScore || 0) < 50).length,
    performanceIssues: nodes.filter(n => (n.metrics?.performanceScore || 0) < 50).length,
    totalTechnicalDebt: d3.sum(nodes.map(n => n.metrics?.technicalDebt || 0)) || 0,
    avgTestCoverage: d3.mean(nodes.map(n => n.metrics?.testCoverage || 0)) || 0,
    totalBugs: d3.sum(nodes.map(n => n.metrics?.bugCount || 0)) || 0,
    totalCodeSmells: d3.sum(nodes.map(n => n.metrics?.codeSmells || 0)) || 0,
    totalVulnerabilities: d3.sum(nodes.map(n => n.metrics?.vulnerabilities || 0)) || 0,
    totalHotspots: d3.sum(nodes.map(n => n.metrics?.hotspots || 0)) || 0,
  };

  // Create color scales
  const nodeColor = d3.scaleOrdinal<string>()
    .domain(['module', 'package', 'file'])
    .range(['#4299e1', '#48bb78', '#ed8936']);

  const linkColor = d3.scaleOrdinal<string>()
    .domain(['import', 'require', 'dependency'])
    .range(['#4299e1', '#48bb78', '#ed8936']);

  const clusterColor = d3.scaleOrdinal<string>()
    .domain(Array.from(new Set(nodes.map(n => n.cluster || 'default'))))
    .range(d3.schemeSet3);

  const complexityColor = d3.scaleSequential(d3.interpolateRdYlGn)
    .domain([0, 100]);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create a container with proper margins
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create the main group element
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add zoom behavior with zoom level tracking
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom as any);

    // Filter nodes and links based on search and filters
    const filteredNodes = nodes.filter(node => {
      const matchesSearch = searchTerm === '' || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedTypes.includes(node.type);
      const matchesCluster = selectedClusters.length === 0 || 
        (node.cluster && selectedClusters.includes(node.cluster));
      return matchesSearch && matchesType && matchesCluster;
    });

    const filteredLinks = links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
const targetId = typeof link.target === 'string' ? link.target : link.target.id;
const sourceNode = nodes.find(n => n.id === sourceId);
const targetNode = nodes.find(n => n.id === targetId);
      const targetNode = nodes.find(n => n.id === link.target.id);
      return sourceNode && targetNode && 
        filteredNodes.includes(sourceNode) && 
        filteredNodes.includes(targetNode);
    });

    // Create the force simulation with advanced parameters
    const simulation = d3.forceSimulation<DependencyNode>(filteredNodes)
      .force("link", d3.forceLink<DependencyNode, DependencyLink>(filteredLinks)
        .id(d => d.id)
        .distance(d => {
          const sourceSize = (d.source as DependencyNode).size || 1;
          const targetSize = (d.target as DependencyNode).size || 1;
          return 100 + (sourceSize + targetSize) * 20;
        })
        .strength(d => (d.strength || 1) * 0.5))
      .force("charge", d3.forceManyBody()
        .strength(d => -300 * ((d as DependencyNode).size || 1))
        .distanceMax(400))
      .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force("collision", d3.forceCollide()
        .radius(d => Math.sqrt((d as DependencyNode).size || 1) * 20 + 20)
        .strength(0.7));

    // Add clustering by adjusting node positions
    if (nodes.some(n => n.cluster)) {
      simulation.on("tick", () => {
        const clusters = new Map<string, { x: number; y: number; count: number }>();
        
        // Calculate cluster centers
        filteredNodes.forEach(node => {
          if (!node.cluster) return;
          const cluster = clusters.get(node.cluster) || { x: 0, y: 0, count: 0 };
          cluster.x += node.x || 0;
          cluster.y += node.y || 0;
          cluster.count++;
          clusters.set(node.cluster, cluster);
        });

        // Adjust node positions towards cluster centers
        filteredNodes.forEach(node => {
          if (!node.cluster) return;
          const cluster = clusters.get(node.cluster);
          if (!cluster) return;

          const centerX = cluster.x / cluster.count;
          const centerY = cluster.y / cluster.count;
          const strength = 0.1;

          node.x = (node.x || 0) + (centerX - (node.x || 0)) * strength;
          node.y = (node.y || 0) + (centerY - (node.y || 0)) * strength;
        });
      });
    }

    // Create the links with curved paths and metrics
    const link = g.append("g")
      .selectAll<SVGPathElement, DependencyLink>("path")
      .data(filteredLinks)
      .enter().append("path")
      .attr("stroke", d => linkColor(d.type))
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.sqrt(d.strength || 1) * 2)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrow)");

    // Add link metrics
    if (showMetrics) {
      link.append("title")
        .text(d => {
          const metrics = d.metrics || {};
          return `
            Type: ${d.type}
            ${metrics.frequency ? `Frequency: ${metrics.frequency}` : ''}
            ${metrics.lastUsed ? `Last Used: ${metrics.lastUsed}` : ''}
            ${metrics.dataVolume ? `Data Volume: ${metrics.dataVolume}` : ''}
            ${metrics.latency ? `Latency: ${metrics.latency}ms` : ''}
            ${metrics.reliability ? `Reliability: ${metrics.reliability}%` : ''}
            ${metrics.security ? `Security Score: ${metrics.security}` : ''}
          `.trim();
        });
    }

    // Add arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    // Create the nodes with advanced styling
    const node = g.append("g")
      .selectAll<SVGGElement, DependencyNode>("g")
      .data(filteredNodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, DependencyNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("mouseover", (event, d) => {
        setHighlightedNode(d.id);
        highlightConnections(d.id);
      })
      .on("mouseout", () => {
        setHighlightedNode(null);
        resetHighlight();
      })
      .on("click", (event, d) => {
        setSelectedNode(d);
      });

    // Add circles to nodes with advanced styling
    node.append("circle")
      .attr("r", d => Math.sqrt(d.size || 1) * 10 + 10)
      .attr("fill", d => {
        const baseColor = nodeColor(d.type);
        if (highlightedNode === d.id) {
          const color = d3.color(baseColor);
          return color ? color.brighter(0.5).toString() : baseColor;
        }
        return baseColor;
      })
      .attr("stroke", d => d.cluster ? clusterColor(d.cluster) : "#fff")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", d => d.metrics?.complexity ? "5,5" : "none");

    // Add node metrics visualization
    if (showMetrics) {
      node.append("circle")
        .attr("r", d => Math.sqrt(d.size || 1) * 8 + 8)
        .attr("fill", d => complexityColor(d.metrics?.complexity || 0))
        .attr("opacity", 0.3);

      // Add warning indicators for critical metrics
      node.filter(d => (d.metrics?.complexity || 0) > 80 || (d.metrics?.bugCount || 0) > 5)
        .append("circle")
        .attr("r", 4)
        .attr("fill", "#ef4444")
        .attr("transform", "translate(-8,-8)");
    }

    // Add labels to nodes with advanced styling
    node.append("text")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#333")
      .style("font-weight", d => d.metrics?.complexity ? "bold" : "normal")
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);

    // Add detailed tooltips
    node.append("title")
      .text(d => {
        const metrics = d.metrics || {};
        return `
          ${d.name}
          Type: ${d.type}
          ${metrics.complexity ? `Complexity: ${metrics.complexity}` : ''}
          ${metrics.dependencies ? `Dependencies: ${metrics.dependencies}` : ''}
          ${metrics.dependents ? `Dependents: ${metrics.dependents}` : ''}
          ${metrics.linesOfCode ? `Lines of Code: ${metrics.linesOfCode}` : ''}
          ${metrics.testCoverage ? `Test Coverage: ${metrics.testCoverage}%` : ''}
          ${metrics.bugCount ? `Bugs: ${metrics.bugCount}` : ''}
          ${metrics.technicalDebt ? `Technical Debt: ${metrics.technicalDebt}` : ''}
          ${metrics.performanceScore ? `Performance: ${metrics.performanceScore}` : ''}
          ${metrics.securityScore ? `Security: ${metrics.securityScore}` : ''}
          ${metrics.maintainabilityScore ? `Maintainability: ${metrics.maintainabilityScore}` : ''}
          ${metrics.commitFrequency ? `Commits/Month: ${metrics.commitFrequency}` : ''}
          ${metrics.contributors ? `Contributors: ${metrics.contributors}` : ''}
          ${metrics.lastModified ? `Last Modified: ${metrics.lastModified}` : ''}
          ${d.cluster ? `Cluster: ${d.cluster}` : ''}
        `.trim();
      });

    // Update positions on simulation tick with curved paths
    simulation.on("tick", () => {
      link.attr("d", d => {
        const source = d.source as DependencyNode;
        const target = d.target as DependencyNode;
        if (!source.x || !source.y || !target.x || !target.y) return '';
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
      });

      node.attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, DependencyNode, DependencyNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, DependencyNode, DependencyNode>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, DependencyNode, DependencyNode>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Highlight connected nodes and links
    function highlightConnections(nodeId: string) {
      link.style("stroke-opacity", l => 
        (l.source.id === nodeId || l.target.id === nodeId) ? 1 : 0.1
      );
      node.style("opacity", n => 
        n.id === nodeId || 
        links.some(l => 
          (l.source.id === nodeId && l.target.id === n.id) || 
          (l.source.id === n.id && l.target.id === nodeId)
        ) ? 1 : 0.1
      );
    }

    // Reset highlights
    function resetHighlight() {
      link.style("stroke-opacity", 0.6);
      node.style("opacity", 1);
    }

    // Add advanced legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(20, 20)`);

    // Node type legend
    const nodeTypes = [
      { type: 'module', label: 'Module' },
      { type: 'package', label: 'Package' },
      { type: 'file', label: 'File' }
    ] as const;

    legend.selectAll<SVGCircleElement, typeof nodeTypes[number]>("circle")
      .data(nodeTypes)
      .enter().append("circle")
      .attr("cx", 0)
      .attr("cy", (d, i) => i * 20)
      .attr("r", 6)
      .style("fill", d => nodeColor(d.type));

    legend.selectAll<SVGTextElement, typeof nodeTypes[number]>("text")
      .data(nodeTypes)
      .enter().append("text")
      .attr("x", 15)
      .attr("y", (d, i) => i * 20 + 5)
      .style("font-size", "12px")
      .style("fill", "#333")
      .text(d => d.label);

    // Cluster legend
    const clusters = Array.from(new Set(nodes.map(n => n.cluster || 'default')));
    const clusterLegend = svg.append("g")
      .attr("class", "cluster-legend")
      .attr("transform", `translate(20, ${height - clusters.length * 20 - 20})`);

    clusterLegend.selectAll<SVGCircleElement, string>("circle")
      .data(clusters)
      .enter().append("circle")
      .attr("cx", 0)
      .attr("cy", (d, i) => i * 20)
      .attr("r", 6)
      .style("fill", d => clusterColor(d));

    clusterLegend.selectAll<SVGTextElement, string>("text")
      .data(clusters)
      .enter().append("text")
      .attr("x", 15)
      .attr("y", (d, i) => i * 20 + 5)
      .style("font-size", "12px")
      .style("fill", "#333")
      .text(d => d);

    // Cleanup
    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, [nodes, links, width, height, searchTerm, selectedTypes, selectedClusters, highlightedNode, showMetrics, layoutMode]);

  // Enhanced node styling based on view mode
  const getNodeStyle = (node: DependencyNode) => {
    if (!node) return {
      fill: '#ccc',
      stroke: '#fff',
      strokeWidth: 2,
      strokeDasharray: 'none',
    };

    switch (viewMode) {
      case 'metrics':
        return {
          fill: d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([0, 100])(node.metrics?.maintainabilityScore || 0),
          stroke: node.metrics?.securityScore ? 
            d3.scaleSequential(d3.interpolateRdYlGn)
              .domain([0, 100])(node.metrics.securityScore) : '#fff',
          strokeWidth: 2,
          strokeDasharray: node.metrics?.complexity ? '5,5' : 'none',
        };
      case 'complexity':
        return {
          fill: d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([0, 100])(node.metrics?.complexity || 0),
          stroke: '#fff',
          strokeWidth: 2,
          strokeDasharray: node.metrics?.cyclomaticComplexity ? '5,5' : 'none',
        };
      case 'security':
        return {
          fill: d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([0, 100])(node.metrics?.securityScore || 0),
          stroke: node.metrics?.vulnerabilities ? '#ef4444' : '#fff',
          strokeWidth: node.metrics?.vulnerabilities ? 3 : 2,
          strokeDasharray: node.metrics?.vulnerabilities ? '5,5' : 'none',
        };
      default:
        return {
          fill: nodeColor(node.type),
          stroke: node.cluster ? clusterColor(node.cluster) : '#fff',
          strokeWidth: 2,
          strokeDasharray: 'none',
        };
    }
  };

  // Enhanced link styling based on metrics
  const getLinkStyle = (link: DependencyLink) => {
    const baseStyle = {
      stroke: linkColor(link.type),
      strokeOpacity: 0.6,
      strokeWidth: Math.sqrt(link.strength || 1) * 2,
    };

    if (viewMode === 'metrics') {
      return {
        ...baseStyle,
        stroke: d3.scaleSequential(d3.interpolateRdYlGn)
          .domain([0, 100])(link.metrics?.complexity || 0),
        strokeWidth: Math.sqrt(link.metrics?.coupling || 1) * 2,
      };
    }

    return baseStyle;
  };

  // Enhanced tooltip content
  const getNodeTooltip = (node: DependencyNode) => {
    const metrics = node.metrics || {};
    return `
      <div class="p-2">
        <h3 class="font-bold text-lg mb-2">${node.name}</h3>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <span class="font-semibold">Type:</span> ${node.type}
          </div>
          ${node.cluster ? `
            <div>
              <span class="font-semibold">Cluster:</span> ${node.cluster}
            </div>
          ` : ''}
          ${metrics.complexity ? `
            <div>
              <span class="font-semibold">Complexity:</span> ${metrics.complexity}
            </div>
          ` : ''}
          ${metrics.dependencies ? `
            <div>
              <span class="font-semibold">Dependencies:</span> ${metrics.dependencies}
            </div>
          ` : ''}
          ${metrics.dependents ? `
            <div>
              <span class="font-semibold">Dependents:</span> ${metrics.dependents}
            </div>
          ` : ''}
          ${metrics.linesOfCode ? `
            <div>
              <span class="font-semibold">Lines of Code:</span> ${metrics.linesOfCode}
            </div>
          ` : ''}
          ${metrics.testCoverage ? `
            <div>
              <span class="font-semibold">Test Coverage:</span> ${metrics.testCoverage}%
            </div>
          ` : ''}
          ${metrics.bugCount ? `
            <div>
              <span class="font-semibold">Bugs:</span> ${metrics.bugCount}
            </div>
          ` : ''}
          ${metrics.technicalDebt ? `
            <div>
              <span class="font-semibold">Technical Debt:</span> ${metrics.technicalDebt}
            </div>
          ` : ''}
          ${metrics.performanceScore ? `
            <div>
              <span class="font-semibold">Performance:</span> ${metrics.performanceScore}
            </div>
          ` : ''}
          ${metrics.securityScore ? `
            <div>
              <span class="font-semibold">Security:</span> ${metrics.securityScore}
            </div>
          ` : ''}
          ${metrics.maintainabilityScore ? `
            <div>
              <span class="font-semibold">Maintainability:</span> ${metrics.maintainabilityScore}
            </div>
          ` : ''}
          ${metrics.commitFrequency ? `
            <div>
              <span class="font-semibold">Commits/Month:</span> ${metrics.commitFrequency}
            </div>
          ` : ''}
          ${metrics.contributors ? `
            <div>
              <span class="font-semibold">Contributors:</span> ${metrics.contributors}
            </div>
          ` : ''}
          ${metrics.lastModified ? `
            <div>
              <span class="font-semibold">Last Modified:</span> ${new Date(metrics.lastModified).toLocaleDateString()}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  // Enhanced link tooltip content
  const getLinkTooltip = (link: DependencyLink) => {
    const metrics = link.metrics || {};
    return `
      <div class="p-2">
        <h3 class="font-bold text-lg mb-2">${link.source.name} → ${link.target.name}</h3>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <span class="font-semibold">Type:</span> ${link.type}
          </div>
          ${metrics.frequency ? `
            <div>
              <span class="font-semibold">Frequency:</span> ${metrics.frequency}
            </div>
          ` : ''}
          ${metrics.lastUsed ? `
            <div>
              <span class="font-semibold">Last Used:</span> ${metrics.lastUsed}
            </div>
          ` : ''}
          ${metrics.dataVolume ? `
            <div>
              <span class="font-semibold">Data Volume:</span> ${metrics.dataVolume}
            </div>
          ` : ''}
          ${metrics.latency ? `
            <div>
              <span class="font-semibold">Latency:</span> ${metrics.latency}ms
            </div>
          ` : ''}
          ${metrics.reliability ? `
            <div>
              <span class="font-semibold">Reliability:</span> ${metrics.reliability}%
            </div>
          ` : ''}
          ${metrics.security ? `
            <div>
              <span class="font-semibold">Security:</span> ${metrics.security}
            </div>
          ` : ''}
          ${metrics.complexity ? `
            <div>
              <span class="font-semibold">Complexity:</span> ${metrics.complexity}
            </div>
          ` : ''}
          ${metrics.coupling ? `
            <div>
              <span class="font-semibold">Coupling:</span> ${metrics.coupling}
            </div>
          ` : ''}
          ${metrics.cohesion ? `
            <div>
              <span class="font-semibold">Cohesion:</span> ${metrics.cohesion}
            </div>
          ` : ''}
          ${metrics.stability ? `
            <div>
              <span class="font-semibold">Stability:</span> ${metrics.stability}
            </div>
          ` : ''}
          ${metrics.volatility ? `
            <div>
              <span class="font-semibold">Volatility:</span> ${metrics.volatility}
            </div>
          ` : ''}
          ${metrics.risk ? `
            <div>
              <span class="font-semibold">Risk:</span> ${metrics.risk}
            </div>
          ` : ''}
          ${metrics.impact ? `
            <div>
              <span class="font-semibold">Impact:</span> ${metrics.impact}
            </div>
          ` : ''}
          ${metrics.criticality ? `
            <div>
              <span class="font-semibold">Criticality:</span> ${metrics.criticality}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Enhanced Controls */}
      <div className="w-full mb-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="standard">Standard View</option>
            <option value="metrics">Metrics View</option>
            <option value="complexity">Complexity View</option>
            <option value="security">Security View</option>
          </select>
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="p-2 text-gray-600 hover:text-gray-900"
            title="Toggle metrics"
          >
            <BarChart2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLayoutMode(layoutMode === 'force' ? 'hierarchical' : 'force')}
            className="p-2 text-gray-600 hover:text-gray-900"
            title="Toggle layout"
          >
            <GitBranch className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-2 text-gray-600 hover:text-gray-900"
            title="Reset zoom"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 4))}
            className="p-2 text-gray-600 hover:text-gray-900"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.1))}
            className="p-2 text-gray-600 hover:text-gray-900"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Graph */}
      <div className="relative w-full overflow-auto" style={{ width, height }}>
        <svg ref={svgRef} className="min-w-[800px] min-h-[500px]"></svg>
      </div>

      {/* Enhanced Statistics and Details */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Graph Overview</h3>
          <div className="space-y-1">
            <p>Total Nodes: {stats.totalNodes}</p>
            <p>Total Links: {stats.totalLinks}</p>
            <p>Clusters: {stats.clusters}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Complexity Metrics</h3>
          <div className="space-y-1">
            <p>Avg Complexity: {stats.avgComplexity.toFixed(1)}</p>
            <p>Critical Nodes: {stats.criticalNodes}</p>
            <p>High Dependencies: {stats.highDependencyNodes}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Quality Metrics</h3>
          <div className="space-y-1">
            <p>Security Issues: {stats.securityIssues}</p>
            <p>Maintainability Issues: {stats.maintainabilityIssues}</p>
            <p>Performance Issues: {stats.performanceIssues}</p>
            <p>Technical Debt: {stats.totalTechnicalDebt.toFixed(1)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Code Quality</h3>
          <div className="space-y-1">
            <p>Test Coverage: {stats.avgTestCoverage.toFixed(1)}%</p>
            <p>Total Bugs: {stats.totalBugs}</p>
            <p>Code Smells: {stats.totalCodeSmells}</p>
            <p>Vulnerabilities: {stats.totalVulnerabilities}</p>
          </div>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-4 w-full bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Selected Node Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <p className="font-medium">{selectedNode.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-500" />
                <p>Type: {selectedNode.type}</p>
              </div>
              {selectedNode.cluster && (
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-500" />
                  <p>Cluster: {selectedNode.cluster}</p>
                </div>
              )}
            </div>
            <div>
              {selectedNode.metrics && (
                <>
                  {selectedNode.metrics.complexity && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-500" />
                      <p>Complexity: {selectedNode.metrics.complexity}</p>
                    </div>
                  )}
                  {selectedNode.metrics.dependencies && (
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-gray-500" />
                      <p>Dependencies: {selectedNode.metrics.dependencies}</p>
                    </div>
                  )}
                  {selectedNode.metrics.lastModified && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <p>Modified: {new Date(selectedNode.metrics.lastModified).toLocaleDateString()}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
        <p>Interactive dependency graph showing relationships between modules, packages, and files. 
        Drag nodes to explore connections. Zoom with mouse wheel or buttons. Search and filter nodes.
        Hover over nodes and links to see detailed metrics. Use different view modes to analyze different aspects of the codebase.</p>
      </div>
    </div>
  );
};

export default DependencyGraph; 