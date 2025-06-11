import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Layers, ChevronRight, Home } from 'lucide-react'; // For empty state and breadcrumbs

export interface FileNode { // Keep export if used by DiagramsPage.tsx for data prep
  name: string;
  path: string;
  size: number;
  children?: FileNode[];
  type: 'file' | 'directory';
  value?: number; // d3.hierarchy will add this if .sum() is used
}

interface FileSystemIcicleProps {
  data: FileNode; // Expect the root node of the file system tree
  width?: number;
  height?: number;
}

const FileSystemIcicle: React.FC<FileSystemIcicleProps> = ({ data, width = 800, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentRootNode, setCurrentRootNode] = useState<d3.HierarchyNode<FileNode> | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<d3.HierarchyNode<FileNode>[]>([]);

  useEffect(() => {
    if (data) {
      const initialRoot = d3.hierarchy(data)
        .sum(d => (d.type === 'file' ? d.size : 0))
        .sort((a, b) => (b.value || 0) - (a.value || 0));
      setCurrentRootNode(initialRoot);
      setBreadcrumbs([initialRoot]);
    } else {
      setCurrentRootNode(null);
      setBreadcrumbs([]);
    }
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    const breadcrumbHeight = 40;
    const displayWidth = width;
    const displayHeight = height - breadcrumbHeight;

    if (!currentRootNode) {
      if (!data || (data.children && data.children.length === 0 && data.name === data.path)) { 
        const g = svg.attr("width", displayWidth).attr("height", displayHeight).append("g")
          .attr("transform", `translate(${displayWidth / 2}, ${displayHeight / 2})`);
        g.append(() => React.createElement(Layers, { className: "w-16 h-16 text-gray-300" }) as unknown as Element)
          .attr('x', -32).attr('y', -50);
        g.append("text").attr("text-anchor", "middle").attr("y", 20)
          .style("font-size", "14px").style("fill", "#6B7280")
          .text("No file system data to display.");
      }
      return;
    }
    
    const partitionLayout = d3.partition<FileNode>() // Renamed to avoid conflict with 'partition' variable if any
      .size([displayWidth, displayHeight])
      .padding(1);

    partitionLayout(currentRootNode); // This mutates currentRootNode, adding x0, y0, x1, y1

    const maxDepth = currentRootNode.height; 
    const color = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, maxDepth]);

    const cell = svg
      .attr("viewBox", `0 0 ${displayWidth} ${displayHeight}`) 
      .attr("width", displayWidth)
      .attr("height", displayHeight)
      .selectAll("g")
      .data(currentRootNode.descendants() as d3.HierarchyRectangularNode<FileNode>[]) // Cast descendants
      .join("g")
        .attr("transform", (d: d3.HierarchyRectangularNode<FileNode>) => `translate(${d.x0},${d.y0})`);

    cell.append("rect")
      .attr("width", (d: d3.HierarchyRectangularNode<FileNode>) => d.x1 - d.x0)
      .attr("height", (d: d3.HierarchyRectangularNode<FileNode>) => d.y1 - d.y0)
      .attr("fill", (d: d3.HierarchyRectangularNode<FileNode>) => d.children ? color(d.depth - (currentRootNode.depth || 0)) : d3.color(color(d.depth - (currentRootNode.depth || 0)))?.brighter(0.5).toString() || "#ccc")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .style("cursor", (d: d3.HierarchyRectangularNode<FileNode>) => d.children ? "pointer" : "default")
      .on("click", (_event: MouseEvent, d: d3.HierarchyRectangularNode<FileNode>) => {
        if (d.children && d !== currentRootNode) { 
          setCurrentRootNode(d);
          const pathNodes: d3.HierarchyNode<FileNode>[] = [];
          let tempNode: d3.HierarchyNode<FileNode> | null = d;
          while(tempNode) {
            pathNodes.unshift(tempNode);
            tempNode = tempNode.parent;
          }
          setBreadcrumbs(pathNodes);
        }
      })
      .on("mouseover", function(event: MouseEvent, d: d3.HierarchyRectangularNode<FileNode>) {
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 1.5);
        const tooltip = d3.select("body").append("div")
          .attr("class", "icicle-tooltip") 
          .style("position", "absolute").style("background", "rgba(0,0,0,0.85)").style("color", "white")
          .style("padding", "8px 12px").style("border-radius", "6px").style("font-size", "12px")
          .style("pointer-events", "none").style("z-index", "1000").style("opacity", 0)
          .style("transition", "opacity 0.2s");
        tooltip.html(`
          <strong class="font-semibold block mb-0.5">${d.data.name}</strong>
          <span class="text-xs text-gray-300 block">${d.data.path}</span>
          ${d.data.type === 'file' ? `<span class="text-xs">Size: ${(d.data.size || 0).toLocaleString()} bytes</span>` : `<span class="text-xs">Items: ${d.children?.length || 0}</span>`}
          ${d.value ? `<br/><span class="text-xs">Total Size: ${d.value.toLocaleString()} bytes</span>` : ''}
        `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 15) + "px")
          .transition().duration(150).style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 0.5);
        d3.selectAll(".icicle-tooltip").remove();
      });

    cell.append("text")
      .attr("x", 4)
      .attr("y", 14)
      .style("font-size", "10px") 
      .style("fill", "#fff")
      .style("font-weight", "500")
      .style("pointer-events", "none")
      .style("text-shadow", "0 0 2px rgba(0,0,0,0.5)")
      .text((d: d3.HierarchyRectangularNode<FileNode>) => {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        if (rectWidth > 40 && rectHeight > 15) { 
          const name = d.data.name;
          const maxLength = Math.floor(rectWidth / 6); 
          return name.length > maxLength ? name.substring(0, maxLength - 2) + '...' : name;
        }
        return '';
      });

  }, [currentRootNode, width, height, data]); 

  const handleBreadcrumbClick = (node: d3.HierarchyNode<FileNode>) => {
    setCurrentRootNode(node);
    const pathNodes: d3.HierarchyNode<FileNode>[] = [];
    let tempNode: d3.HierarchyNode<FileNode> | null = node;
    while(tempNode) {
        pathNodes.unshift(tempNode);
        tempNode = tempNode.parent;
    }
    setBreadcrumbs(pathNodes);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full flex items-center space-x-1 text-xs text-gray-600 p-2 border-b mb-1 overflow-x-auto whitespace-nowrap sticky top-0 bg-white z-10">
        {breadcrumbs.map((node, index) => (
          <React.Fragment key={node.data.path || node.data.name + index}> 
            {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
            <button
              onClick={() => handleBreadcrumbClick(node)}
              className={`hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 ${index === breadcrumbs.length - 1 ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}
              title={node.data.path}
            >
              {index === 0 && breadcrumbs.length > 1 ? <Home className="w-3 h-3 inline-block mr-1 align-middle" /> : null}
              <span className="align-middle">{node.data.name || 'Root'}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
      <svg ref={svgRef} className="w-full h-auto" style={{ display: 'block' }}></svg> 
      <div className="mt-2 text-xs text-gray-500 text-center max-w-lg mx-auto">
        <p>Icicle chart visualizing file system hierarchy. Cell size represents total size of contents. Click on directories to zoom. Colors indicate depth.</p>
      </div>
    </div>
  );
};

export default FileSystemIcicle;
