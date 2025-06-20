import React, { useRef, useEffect } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

export interface DependencyNode {
  id: string;
  name: string;
  type?: string;
  path?: string;
  size?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  color?: string;
  metrics?: {
    complexity: number;
    dependencies: number;
    dependents: number;
    lastModified: string;
  };
}

export interface DependencyLink {
  source: DependencyNode | string;
  target: DependencyNode | string;
  type?: string;
  strength?: number;
}

interface Props {
  nodes: DependencyNode[];
  links: DependencyLink[];
  height?: number;
  width?: number;
}

const DependencyGraph: React.FC<Props> = ({ 
  nodes, 
  links,
  height = 600, 
  width = 900 
}) => {
  const fg = useRef<ForceGraphMethods<any, any>>();

  // Auto-fit graph on mount
  useEffect(() => {
    if (fg.current) {
      // Give the graph a moment to render, then zoom to fit
      setTimeout(() => {
        fg.current?.zoomToFit(400, 20);
      }, 100);
    }
  }, [nodes, links]);

  // Validate data
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p className="text-center">
          {!nodes ? 'No dependency data available.' : 
           nodes.length === 0 ? 'No nodes found in dependency graph.' :
           'Invalid dependency graph data.'}
        </p>
      </div>
    );
  }

  const handleNodeClick = (node: DependencyNode) => {
    console.log('Node clicked:', node);
    // Could emit event or call parent callback here
  };

  const handleLinkClick = (link: DependencyLink) => {
    console.log('Link clicked:', link);
  };

  return (
    <div className="w-full h-full border border-gray-200 rounded-lg overflow-hidden">
      <ForceGraph2D
        ref={fg}
        graphData={{ nodes, links }}  // ✅ Correct API - single object with nodes and links
        nodeId="id"
        nodeLabel={(node: DependencyNode) => `${node.name || node.id}\n${node.type || 'module'}`}
        nodeAutoColorBy="type"
        nodeColor={(node: DependencyNode) => {
          // Color nodes by type
          switch (node.type) {
            case 'component': return '#3b82f6';  // blue
            case 'service': return '#10b981';    // green
            case 'api': return '#f59e0b';        // amber
            case 'page': return '#8b5cf6';       // purple
            case 'hook': return '#ef4444';       // red
            case 'utility': return '#6b7280';    // gray
            default: return '#374151';           // dark gray
          }
        }}
        nodeVal={(node: DependencyNode) => (node.metrics?.dependencies ?? 1) * 4 + 4} // Node size by dependency count
        linkSource="source"
        linkTarget="target"
        linkColor={(link: DependencyLink) => link.type === 'devDependency' ? '#f59e0b' : '#9ca3af'}
        linkWidth={(link: DependencyLink) => Math.log((link.strength ?? 1) + 1) * 2 + 1}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1}
        linkDirectionalParticleSpeed={(link: DependencyLink) => (link.strength ?? 1) * 0.005}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        backgroundColor="#f3f4f6"
        width={width}
        height={height}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        nodeCanvasObject={(node: DependencyNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.name || node.id;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          
          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, 5, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color || '#374151';
          ctx.fill();
          
          // Draw label
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#1f2937';
          ctx.fillText(label, node.x || 0, (node.y || 0) + 15);
        }}
      />
    </div>
  );
};

export default DependencyGraph;
