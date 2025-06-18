import React, { useState } from 'react';

// Interfaces
export interface RouteNode {
  name: string;
  path: string;
  method?: string;
  children?: RouteNode[];
  file?: string;
}

interface APIRouteTreeProps {
  routes?: RouteNode;
  width?: number;
  height?: number;
}

interface NodeDetails {
  node: RouteNode;
  connections: {
    parent?: RouteNode;
    children: RouteNode[];
    siblings: RouteNode[];
  };
}

const NodeDetailModal: React.FC<{
  details: NodeDetails | null;
  onClose: () => void;
}> = ({ details, onClose }) => {
  if (!details) return null;

  const { node, connections } = details;

  const getRequestDescription = (method?: string) => {
    switch(method?.toUpperCase()) {
      case 'GET': return 'Retrieves data from the server. Safe and idempotent operation.';
      case 'POST': return 'Creates new resources on the server. Not idempotent.';
      case 'PUT': return 'Updates or creates resources. Idempotent operation.';
      case 'DELETE': return 'Removes resources from the server. Idempotent operation.';
      case 'PATCH': return 'Partially updates existing resources. May not be idempotent.';
      default: return 'Path segment - organizes API endpoints hierarchically.';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Endpoint Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <p className="text-lg font-semibold text-gray-900">{node.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <div className="flex items-center space-x-2">
                {node.method ? (
                  <>
                    <span className="text-lg">{getMethodIcon(node.method)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getMethodColor(node.method)}`}>
                      {node.method}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">📁</span>
                    <span className="text-gray-500">Path Segment</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
            <code className="block bg-gray-100 p-3 rounded-md text-sm font-mono text-gray-900">
              {node.path}
            </code>
          </div>

          {node.file && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source File</label>
              <code className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">{node.file}</code>
            </div>
          )}

          {/* Request Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-800">{getRequestDescription(node.method)}</p>
            </div>
          </div>

          {/* Connections */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
            
            {connections.parent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parent</label>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center space-x-2">
                    <span>{connections.parent.method ? getMethodIcon(connections.parent.method) : '📁'}</span>
                    <span className="font-medium">{connections.parent.name}</span>
                    <code className="text-xs text-gray-500">{connections.parent.path}</code>
                  </div>
                </div>
              </div>
            )}

            {connections.children.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Children ({connections.children.length})
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {connections.children.map((child, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded-md">
                      <div className="flex items-center space-x-2">
                        <span>{child.method ? getMethodIcon(child.method) : '📁'}</span>
                        <span className="font-medium text-sm">{child.name}</span>
                        {child.method && (
                          <span className={`px-1.5 py-0.5 rounded-full text-xs ${getMethodColor(child.method)}`}>
                            {child.method}
                          </span>
                        )}
                        <code className="text-xs text-gray-500">{child.path}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {connections.siblings.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Siblings ({connections.siblings.length})
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {connections.siblings.map((sibling, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded-md">
                      <div className="flex items-center space-x-2">
                        <span>{sibling.method ? getMethodIcon(sibling.method) : '📁'}</span>
                        <span className="font-medium text-sm">{sibling.name}</span>
                        {sibling.method && (
                          <span className={`px-1.5 py-0.5 rounded-full text-xs ${getMethodColor(sibling.method)}`}>
                            {sibling.method}
                          </span>
                        )}
                        <code className="text-xs text-gray-500">{sibling.path}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!connections.parent && connections.children.length === 0 && connections.siblings.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p>No connections found</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const TreeNode: React.FC<{ 
  node: RouteNode; 
  level: number; 
  isExpanded: boolean;
  onToggle: () => void;
  onNodeClick: () => void;
}> = ({ node, level, isExpanded, onToggle, onNodeClick }) => {
  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 20;
  
  const getMethodColor = (method?: string) => {
    switch(method?.toUpperCase()) {
      case 'GET': return 'text-green-600 bg-green-100';
      case 'POST': return 'text-blue-600 bg-blue-100';
      case 'PUT': return 'text-yellow-600 bg-yellow-100';
      case 'DELETE': return 'text-red-600 bg-red-100';
      case 'PATCH': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMethodIcon = (method?: string) => {
    switch(method?.toUpperCase()) {
      case 'GET': return '📖'; // Book - reading data
      case 'POST': return '➕'; // Plus - creating data
      case 'PUT': return '✏️'; // Pencil - updating data
      case 'DELETE': return '🗑️'; // Trash - deleting data
      case 'PATCH': return '🔧'; // Wrench - modifying data
      default: return '🔗'; // Link - generic endpoint
    }
  };

  return (
    <div className="select-none">
      <div 
        className="flex items-center py-1 px-2 hover:bg-gray-50 cursor-pointer rounded"
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            onNodeClick();
          } else if (hasChildren) {
            onToggle();
          } else {
            onNodeClick();
          }
        }}
      >
        {hasChildren && (
          <span className="mr-2 text-gray-500 font-mono text-sm">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="w-6"></span>}
        
        <div className="flex items-center space-x-2 flex-1" onClick={onNodeClick}>
          <span className="text-lg mr-1">
            {node.method ? getMethodIcon(node.method) : '📁'}
          </span>
          <span className="font-medium text-gray-900">
            {node.name}
          </span>
          {node.method && (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getMethodColor(node.method)}`}>
              {node.method}
            </span>
          )}
          {!node.method && (
            <span className="text-xs text-gray-500 font-mono">{node.path}</span>
          )}
        </div>
        
        {node.file && (
          <span className="text-xs text-gray-400 ml-auto">{node.file}</span>
        )}
      </div>
    </div>
  );
};

const ExpandableTree: React.FC<{ 
  node: RouteNode; 
  level?: number;
  expandedNodes: Set<string>;
  onToggle: (path: string) => void;
  onNodeClick: (node: RouteNode, parent?: RouteNode, siblings?: RouteNode[]) => void;
  parent?: RouteNode;
  siblings?: RouteNode[];
}> = ({ node, level = 0, expandedNodes, onToggle, onNodeClick, parent, siblings = [] }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.path);

  return (
    <div>
      <TreeNode
        node={node}
        level={level}
        isExpanded={isExpanded}
        onToggle={() => onToggle(node.path)}
        onNodeClick={() => onNodeClick(node, parent, siblings)}
      />
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child, index) => (
            <ExpandableTree
              key={`${child.path}-${index}`}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onNodeClick={onNodeClick}
              parent={node}
              siblings={node.children!.filter((_, i) => i !== index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function APIRouteTree({ routes }: APIRouteTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['/api']));
  const [nodeDetails, setNodeDetails] = useState<NodeDetails | null>(null);
  const [showModal, setShowModal] = useState(false);

  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (!routes) return;
    const allPaths = new Set<string>();
    
    const collectPaths = (node: RouteNode) => {
      allPaths.add(node.path);
      if (node.children) {
        node.children.forEach(collectPaths);
      }
    };
    
    collectPaths(routes);
    setExpandedNodes(allPaths);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['/api']));
  };

  const getMethodColor = (method?: string) => {
    switch(method?.toUpperCase()) {
      case 'GET': return 'text-green-600 bg-green-100';
      case 'POST': return 'text-blue-600 bg-blue-100';
      case 'PUT': return 'text-yellow-600 bg-yellow-100';
      case 'DELETE': return 'text-red-600 bg-red-100';
      case 'PATCH': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMethodIcon = (method?: string) => {
    switch(method?.toUpperCase()) {
      case 'GET': return '📖';
      case 'POST': return '➕';
      case 'PUT': return '✏️';
      case 'DELETE': return '🗑️';
      case 'PATCH': return '🔧';
      default: return '🔗';
    }
  };

  const handleNodeClick = (node: RouteNode, parent?: RouteNode, siblings: RouteNode[] = []) => {
    setNodeDetails({
      node,
      connections: {
        parent,
        children: node.children || [],
        siblings
      }
    });
    setShowModal(true);
  };

  if (!routes) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">🌳</div>
          <p>No API routes found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white rounded-lg shadow border overflow-auto">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">API Route Tree</h3>
        <div className="flex space-x-2">
          <button
            onClick={expandAll}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="p-4">
        <div className="mb-4 text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>📁 = Path segment</span>
            <span>📖 = GET</span>
            <span>➕ = POST</span>
            <span>✏️ = PUT</span>
            <span>🗑️ = DELETE</span>
            <span>🔧 = PATCH</span>
          </div>
        </div>
         <ExpandableTree
           node={routes}
           expandedNodes={expandedNodes}
           onToggle={toggleNode}
           onNodeClick={handleNodeClick}
         />
       </div>

      {/* Legend */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1">
            <span className="px-2 py-1 rounded-full text-xs font-semibold text-green-600 bg-green-100">GET</span>
            <span className="text-gray-600">Read data</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-1 rounded-full text-xs font-semibold text-blue-600 bg-blue-100">POST</span>
            <span className="text-gray-600">Create data</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-1 rounded-full text-xs font-semibold text-yellow-600 bg-yellow-100">PUT</span>
            <span className="text-gray-600">Update data</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-1 rounded-full text-xs font-semibold text-red-600 bg-red-100">DELETE</span>
            <span className="text-gray-600">Remove data</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      <NodeDetailModal
        details={nodeDetails}
        onClose={() => {
          setShowModal(false);
          setNodeDetails(null);
        }}
      />
    </div>
  );
}
