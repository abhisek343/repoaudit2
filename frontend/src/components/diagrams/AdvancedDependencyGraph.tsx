import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Aperture, RotateCcw, Search, Filter, Info, 
  Zap, Eye, EyeOff, Play, Pause 
} from 'lucide-react';

export interface EnhancedDependencyData {
  source: string;
  target: string;
  value: number;
  type?: 'import' | 'export' | 'reference' | 'inheritance' | 'async' | 'config';
  category?: 'component' | 'service' | 'utility' | 'api' | 'type' | 'config' | 'test';
  strength?: number;
  bidirectional?: boolean;
  critical?: boolean;
}

interface NodeData extends d3.SimulationNodeDatum {
  id: string;
  group: string;
  size: number;
  connections: number;
  type: string;
  importance: number;
  clusterId?: number;
  highlighted?: boolean;
}

interface LinkData extends d3.SimulationLinkDatum<NodeData> {
  value: number;
  type: string;
  strength: number;
  critical: boolean;
  highlighted?: boolean;
}

interface AdvancedDependencyGraphProps {
  dependencies?: EnhancedDependencyData[];
  width?: number;
  height?: number;
  title?: string;
}

const AdvancedDependencyGraph: React.FC<AdvancedDependencyGraphProps> = ({ 
  dependencies = [], 
  width = 1200, 
  height = 800,
  title = "Advanced Dependency Graph"
}) => {
  const svgRef = useRef<SVGSVGElement>(null);  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showClusters, setShowClusters] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);

  // Process and enhance data
  const processedData = useMemo(() => {
    if (!dependencies || dependencies.length === 0) return { nodes: [], links: [] };

    const nodeMap = new Map<string, NodeData>();
    const linkArray: LinkData[] = [];

    // Analyze connections to determine importance
    const connectionCounts = new Map<string, number>();
    dependencies.forEach(dep => {
      connectionCounts.set(dep.source, (connectionCounts.get(dep.source) || 0) + dep.value);
      connectionCounts.set(dep.target, (connectionCounts.get(dep.target) || 0) + dep.value);
    });

    // Create nodes with enhanced properties
    const allNodes = Array.from(new Set([
      ...dependencies.map(d => d.source),
      ...dependencies.map(d => d.target)
    ]));

    allNodes.forEach(nodeId => {
      const connections = connectionCounts.get(nodeId) || 0;
      const type = dependencies.find(d => d.source === nodeId || d.target === nodeId)?.category || 'utility';
      
      nodeMap.set(nodeId, {
        id: nodeId,
        group: type,
        size: Math.max(8, Math.min(40, connections * 2)),
        connections,
        type,
        importance: connections / Math.max(...connectionCounts.values()),
        highlighted: selectedNode === nodeId || 
                    (searchTerm && nodeId.toLowerCase().includes(searchTerm.toLowerCase()))
      });
    });

    // Create enhanced links
    dependencies.forEach(dep => {
      const sourceNode = nodeMap.get(dep.source);
      const targetNode = nodeMap.get(dep.target);
      
      if (sourceNode && targetNode) {
        linkArray.push({
          source: sourceNode,
          target: targetNode,
          value: dep.value,
          type: dep.type || 'reference',
          strength: dep.strength || dep.value,
          critical: dep.critical || dep.value > 5,
          highlighted: selectedNode === dep.source || selectedNode === dep.target
        });
      }
    });

    // Cluster detection using community detection algorithm
    if (showClusters) {
      const clusters = detectCommunities(Array.from(nodeMap.values()), linkArray);
      clusters.forEach((clusterId, nodeId) => {
        const node = nodeMap.get(nodeId);
        if (node) node.clusterId = clusterId;
      });
    }

    return {
      nodes: Array.from(nodeMap.values()),
      links: linkArray
    };
  }, [dependencies, selectedNode, searchTerm, showClusters]);

  // Community detection algorithm (simplified Louvain)
  const detectCommunities = (nodes: NodeData[], links: LinkData[]): Map<string, number> => {
    const communities = new Map<string, number>();
    const nodeConnections = new Map<string, Set<string>>();

    // Build adjacency map
    links.forEach(link => {
      const sourceId = (link.source as NodeData).id;
      const targetId = (link.target as NodeData).id;
      
      if (!nodeConnections.has(sourceId)) nodeConnections.set(sourceId, new Set());
      if (!nodeConnections.has(targetId)) nodeConnections.set(targetId, new Set());
      
      nodeConnections.get(sourceId)!.add(targetId);
      nodeConnections.get(targetId)!.add(sourceId);
    });

    // Simple clustering by connection density
    let clusterId = 0;
    const visited = new Set<string>();

    nodes.forEach(node => {
      if (visited.has(node.id)) return;
      
      const cluster = new Set<string>([node.id]);
      const queue = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const connections = nodeConnections.get(currentId) || new Set();
        
        connections.forEach(connectedId => {
          if (!visited.has(connectedId) && connections.size >= 2) {
            visited.add(connectedId);
            cluster.add(connectedId);
            queue.push(connectedId);
          }
        });
      }

      cluster.forEach(nodeId => communities.set(nodeId, clusterId));
      clusterId++;
    });

    return communities;
  };

  // Color schemes
  const colorSchemes = {
    type: d3.scaleOrdinal()
      .domain(['component', 'service', 'utility', 'api', 'type', 'config', 'test'])
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#f97316']),
    cluster: d3.scaleOrdinal(d3.schemeCategory10),
    importance: d3.scaleSequential(d3.interpolateViridis)
  };

  const linkColors = {
    import: '#3b82f6',
    export: '#10b981', 
    reference: '#6b7280',
    inheritance: '#8b5cf6',
    async: '#f59e0b',
    config: '#ef4444'
  };

  // Advanced force simulation with multiple forces
  const createSimulation = useCallback((nodes: NodeData[], links: LinkData[]) => {
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink<NodeData, LinkData>(links)
        .id(d => d.id)
        .distance(d => 30 + (d.strength * 20))
        .strength(0.3))
      .force("charge", d3.forceManyBody()
        .strength(d => -300 - (d.importance * 200)))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide()
        .radius(d => d.size + 2))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    // Add clustering forces if enabled
    if (showClusters) {
      simulation.force("cluster", (alpha: number) => {
        nodes.forEach(node => {
          if (node.clusterId !== undefined) {
            const clusterNodes = nodes.filter(n => n.clusterId === node.clusterId);
            const centerX = d3.mean(clusterNodes, d => d.x!) || width / 2;
            const centerY = d3.mean(clusterNodes, d => d.y!) || height / 2;
            
            node.vx = (node.vx || 0) + (centerX - (node.x || 0)) * alpha * 0.1;
            node.vy = (node.vy || 0) + (centerY - (node.y || 0)) * alpha * 0.1;
          }
        });
      });
    }

    return simulation;
  }, [width, height, showClusters]);

  useEffect(() => {
    if (!svgRef.current || processedData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create main container with zoom/pan
    const container = svg.append("g").attr("class", "main-container");
    
    // Add gradient definitions
    const defs = svg.append("defs");
    
    // Create arrow markers for different link types
    Object.keys(linkColors).forEach(type => {
      defs.append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", linkColors[type as keyof typeof linkColors]);
    });

    // Add glow filter
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Create cluster backgrounds if enabled
    if (showClusters) {
      const clusterGroups = d3.group(processedData.nodes, d => d.clusterId);
      
      const clusters = container.append("g")
        .attr("class", "clusters")
        .selectAll(".cluster")
        .data(Array.from(clusterGroups.entries()))
        .join("ellipse")
        .attr("class", "cluster")
        .attr("fill", d => colorSchemes.cluster(d[0]?.toString() || "0"))
        .attr("fill-opacity", 0.1)
        .attr("stroke", d => colorSchemes.cluster(d[0]?.toString() || "0"))
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.3);
    }

    // Create links with enhanced styling
    const link = container.append("g")
      .attr("class", "links")
      .selectAll(".link")
      .data(processedData.links)
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", d => linkColors[d.type as keyof typeof linkColors] || "#6b7280")
      .attr("stroke-width", d => Math.max(1, d.strength * 2))
      .attr("stroke-opacity", d => d.highlighted ? 0.8 : 0.4)
      .attr("marker-end", d => `url(#arrow-${d.type})`)
      .style("filter", d => d.critical ? "url(#glow)" : "none");

    // Create nodes with enhanced visuals
    const nodeGroup = container.append("g")
      .attr("class", "nodes")
      .selectAll(".node")
      .data(processedData.nodes)
      .join("g")
      .attr("class", "node");

    // Node circles with multiple rings for importance
    nodeGroup.each(function(d) {
      const group = d3.select(this);
      
      // Outer ring for importance
      if (d.importance > 0.5) {
        group.append("circle")
          .attr("r", d.size + 6)
          .attr("fill", "none")
          .attr("stroke", colorSchemes.importance(d.importance))
          .attr("stroke-width", 3)
          .attr("stroke-opacity", 0.6);
      }
      
      // Main node circle
      group.append("circle")
        .attr("r", d.size)
        .attr("fill", d => showClusters && d.clusterId !== undefined ? 
          colorSchemes.cluster(d.clusterId.toString()) : 
          colorSchemes.type(d.group))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("filter", d => d.highlighted ? "url(#glow)" : "none");
      
      // Node labels
      group.append("text")
        .text(d => d.id.length > 12 ? d.id.substring(0, 10) + "..." : d.id)
        .attr("dy", d.size + 16)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", d => d.highlighted ? "bold" : "normal")
        .attr("fill", "#374151");
    });

    // Create simulation
    const simulation = createSimulation(processedData.nodes, processedData.links);

    // Add interactivity
    nodeGroup
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(selectedNode === d.id ? null : d.id);
      })
      .on("mouseover", function(event, d) {
        d3.select(this).select("circle").transition().duration(200).attr("r", d.size * 1.3);
        
        // Highlight connected nodes and links
        link.style("stroke-opacity", l => 
          (l.source as NodeData).id === d.id || (l.target as NodeData).id === d.id ? 0.8 : 0.1);
        nodeGroup.style("opacity", n => 
          n.id === d.id || processedData.links.some(l => 
            ((l.source as NodeData).id === d.id && (l.target as NodeData).id === n.id) ||
            ((l.target as NodeData).id === d.id && (l.source as NodeData).id === n.id)
          ) ? 1 : 0.3);
      })
      .on("mouseout", function(event, d) {
        d3.select(this).select("circle").transition().duration(200).attr("r", d.size);
        link.style("stroke-opacity", l => l.highlighted ? 0.8 : 0.4);
        nodeGroup.style("opacity", 1);
      })
      .call(d3.drag<SVGGElement, NodeData>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Animation loop
    simulation.on("tick", () => {
      // Update cluster backgrounds
      if (showClusters) {
        const clusterGroups = d3.group(processedData.nodes, d => d.clusterId);
        container.selectAll(".cluster")
          .data(Array.from(clusterGroups.entries()))
          .attr("cx", d => d3.mean(d[1], n => n.x!) || 0)
          .attr("cy", d => d3.mean(d[1], n => n.y!) || 0)
          .attr("rx", d => Math.max(50, d3.max(d[1], n => 
            Math.sqrt(Math.pow((n.x! - (d3.mean(d[1], m => m.x!) || 0)), 2) + 
                     Math.pow((n.y! - (d3.mean(d[1], m => m.y!) || 0)), 2))) || 0) + 30)
          .attr("ry", d => Math.max(40, d3.max(d[1], n => 
            Math.sqrt(Math.pow((n.x! - (d3.mean(d[1], m => m.x!) || 0)), 2) + 
                     Math.pow((n.y! - (d3.mean(d[1], m => m.y!) || 0)), 2))) || 0) + 20);
      }

      // Update links with curved paths
      link.attr("d", d => {
        const source = d.source as NodeData;
        const target = d.target as NodeData;
        const dx = target.x! - source.x!;
        const dy = target.y! - source.y!;
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.3;
        return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
      });

      // Update nodes
      nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Cleanup
    return () => {
      simulation.stop();
    };

  }, [processedData, createSimulation, selectedNode, showClusters]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalNodes = processedData.nodes.length;
    const totalLinks = processedData.links.length;
    const avgConnections = totalNodes > 0 ? totalLinks / totalNodes : 0;
    const maxConnections = Math.max(...processedData.nodes.map(n => n.connections), 0);
    const clusters = new Set(processedData.nodes.map(n => n.clusterId)).size;

    return { totalNodes, totalLinks, avgConnections: avgConnections.toFixed(1), maxConnections, clusters };
  }, [processedData]);

  if (!dependencies || dependencies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
        <Aperture className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Dependency Data</h3>
        <p className="text-sm text-gray-500 text-center max-w-md">
          Upload or analyze a repository to see an advanced dependency graph visualization.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header with controls */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 rounded-md text-gray-900 placeholder-gray-500 bg-white/90"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 rounded-md text-gray-900 bg-white/90"
            >
              <option value="all">All Types</option>
              <option value="component">Components</option>
              <option value="service">Services</option>
              <option value="utility">Utilities</option>
              <option value="api">APIs</option>
            </select>
          </div>

          <button
            onClick={() => setShowClusters(!showClusters)}
            className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
              showClusters ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {showClusters ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Clusters
          </button>

          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
              showMetrics ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Info className="w-4 h-4" />
            Metrics
          </button>
        </div>
      </div>

      {/* Metrics panel */}
      {showMetrics && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{metrics.totalNodes}</div>
              <div className="text-xs text-gray-600">Nodes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{metrics.totalLinks}</div>
              <div className="text-xs text-gray-600">Links</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{metrics.avgConnections}</div>
              <div className="text-xs text-gray-600">Avg Connections</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{metrics.maxConnections}</div>
              <div className="text-xs text-gray-600">Max Connections</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{metrics.clusters}</div>
              <div className="text-xs text-gray-600">Clusters</div>
            </div>
          </div>
        </div>
      )}

      {/* Main visualization */}
      <div className="relative">
        <svg 
          ref={svgRef} 
          width={width} 
          height={height}
          className="w-full bg-gradient-to-br from-gray-50 to-blue-50"
        />
        
        {/* Selected node info */}
        {selectedNode && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs border">
            <h4 className="font-semibold text-gray-900 mb-2">Node Details</h4>
            <div className="text-sm space-y-1">
              <div><span className="font-medium">ID:</span> {selectedNode}</div>
              {(() => {
                const node = processedData.nodes.find(n => n.id === selectedNode);
                return node ? (
                  <>
                    <div><span className="font-medium">Type:</span> {node.type}</div>
                    <div><span className="font-medium">Connections:</span> {node.connections}</div>
                    <div><span className="font-medium">Importance:</span> {(node.importance * 100).toFixed(0)}%</div>
                    {node.clusterId !== undefined && (
                      <div><span className="font-medium">Cluster:</span> {node.clusterId}</div>
                    )}
                  </>
                ) : null;
              })()}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Deselect
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex flex-wrap gap-6 justify-center text-xs">
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">Node Types:</span>
            {['component', 'service', 'utility', 'api', 'type'].map(type => (
              <div key={type} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: colorSchemes.type(type) }}
                />
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">Link Types:</span>
            {Object.entries(linkColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div 
                  className="w-4 h-0.5" 
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedDependencyGraph;
