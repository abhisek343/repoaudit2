import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { SystemArchitecture } from '../types';
import { Code, GitBranch, Package, Shield, Activity, ArrowRight } from 'lucide-react';

interface SystemArchitectureViewProps {
  systemArchitecture: SystemArchitecture;
}

const SystemArchitectureView: React.FC<SystemArchitectureViewProps> = ({ systemArchitecture }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mermaidRef.current && systemArchitecture.mermaidDiagram) {
      // Initialize mermaid
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        themeVariables: {
          primaryColor: '#6366f1',
          primaryTextColor: '#1f2937',
          primaryBorderColor: '#4f46e5',
          lineColor: '#6b7280',
          secondaryColor: '#f3f4f6',
          tertiaryColor: '#e5e7eb'
        }
      });

      // Clear previous content
      mermaidRef.current.innerHTML = '';

      // Render the diagram
      const diagramId = `mermaid-diagram-${Date.now()}`;
      mermaidRef.current.innerHTML = `<div class="mermaid" id="${diagramId}">${systemArchitecture.mermaidDiagram}</div>`;
      
      // Re-render mermaid
      mermaid.init(undefined, `#${diagramId}`);
    }
  }, [systemArchitecture.mermaidDiagram]);

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'frontend':
        return <Code className="w-4 h-4 text-blue-500" />;
      case 'backend':
        return <Activity className="w-4 h-4 text-green-500" />;
      case 'api':
        return <GitBranch className="w-4 h-4 text-purple-500" />;
      case 'database':
        return <Package className="w-4 h-4 text-orange-500" />;
      case 'middleware':
        return <Shield className="w-4 h-4 text-red-500" />;
      default:
        return <Code className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLayerColor = (type: string) => {
    switch (type) {
      case 'presentation':
        return 'bg-blue-50 border-blue-200';
      case 'business':
        return 'bg-green-50 border-green-200';
      case 'data':
        return 'bg-orange-50 border-orange-200';
      case 'infrastructure':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <GitBranch className="w-6 h-6 text-indigo-500 mr-3" />
          System Architecture
        </h2>
        
        {/* Summary */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-indigo-800 mb-2">Architecture Summary</h3>
          <p className="text-indigo-700 text-sm leading-relaxed">{systemArchitecture.summary}</p>
        </div>

        {/* Patterns */}
        {systemArchitecture.patterns.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Detected Patterns</h3>
            <div className="flex flex-wrap gap-2">
              {systemArchitecture.patterns.map((pattern, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                >
                  {pattern}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{systemArchitecture.layers.length}</div>
            <div className="text-sm text-blue-700">Architecture Layers</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{systemArchitecture.components.length}</div>
            <div className="text-sm text-green-700">Components</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{systemArchitecture.dependencies.length}</div>
            <div className="text-sm text-purple-700">Dependencies</div>
          </div>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Architecture Diagram</h3>
        <div 
          ref={mermaidRef}
          className="bg-gray-50 rounded-lg p-4 overflow-x-auto"
          style={{ minHeight: '400px' }}
        />
      </div>

      {/* Layers Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Architecture Layers</h3>
        <div className="space-y-4">
          {systemArchitecture.layers.map((layer, layerIndex) => (
            <div
              key={layerIndex}
              className={`rounded-lg border-2 p-4 ${getLayerColor(layer.type)}`}
            >
              <h4 className="font-semibold text-gray-800 mb-3 capitalize">
                {layer.name} ({layer.type})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {layer.components.map((component, componentIndex) => (
                  <div
                    key={componentIndex}
                    className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
                  >
                    <div className="flex items-center mb-2">
                      {getComponentIcon(component.type)}
                      <span className="font-medium text-gray-800 ml-2 text-sm">{component.name}</span>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">{component.path}</div>
                    {component.description && (
                      <div className="text-xs text-gray-500 mb-2">{component.description}</div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{component.files.length} files</span>
                      <span className="font-medium text-indigo-600">
                        Complexity: {component.complexity.toFixed(1)}
                      </span>
                    </div>
                    {component.dependencies.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Dependencies:</div>
                        <div className="flex flex-wrap gap-1">
                          {component.dependencies.slice(0, 3).map((dep, depIndex) => (
                            <span
                              key={depIndex}
                              className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {dep}
                            </span>
                          ))}
                          {component.dependencies.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{component.dependencies.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dependencies Overview */}
      {systemArchitecture.dependencies.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Component Dependencies</h3>
          <div className="space-y-2">
            {systemArchitecture.dependencies.slice(0, 10).map((dep, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <span className="font-medium text-gray-800">{dep.from}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
                  <span className="font-medium text-gray-800">{dep.to}</span>
                </div>
                <span className="text-sm text-gray-500 capitalize">{dep.type}</span>
              </div>
            ))}
            {systemArchitecture.dependencies.length > 10 && (
              <div className="text-center py-2">
                <span className="text-sm text-gray-500">
                  +{systemArchitecture.dependencies.length - 10} more dependencies
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemArchitectureView;
