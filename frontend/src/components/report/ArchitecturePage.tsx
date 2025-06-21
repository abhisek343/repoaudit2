import React, { useState, useMemo } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, Cell, TooltipProps
} from 'recharts';
import { 
  TrendingUp,
  Layers,
  Shield,
  Target,
  Brain, 
  AlertTriangle
} from 'lucide-react';
import DependencyGraph, { DependencyNode as VisDependencyNode, DependencyLink as VisDependencyLink } from '../diagrams/DependencyGraph';
import ArchitectureDiagram from '../diagrams/ArchitectureDiagram';
import { AnalysisResult, FileInfo } from '../../types'; // Changed ExtendedFileInfo to FileInfo
import { defaultDependencyConfig } from '../../config/dependencies.config';
import { defaultSecurityConfig } from '../../config/security.config';
import { checkLLMAvailability } from '../../api/llm';
import { DependencyMetricsDisplay } from '../DependencyMetrics';


interface ComplexityData {
  name: string;
  path: string; 
  size: number;
  complexity: number;
  dependenciesCount?: number; 
  contributorsCount?: number; 
  commitCount?: number;
  type?: string; 
}

interface ArchitecturePageProps {
  analysisResult: AnalysisResult;
}

const ArchitecturePage: React.FC<ArchitecturePageProps> = ({ analysisResult: reportData }) => {
  const [selectedDiagram, setSelectedDiagram] = useState<string>('architecture'); 
  const [useLLM, setUseLLM] = useState(true);
  const [llmConfig, setLlmConfig] = useState<import('../../types').LLMConfig | null>(null);
  
  const { hotspots, architectureAnalysis, metrics, files = [], securityIssues, dependencyMetrics } = reportData;
  const [isLLMAvailable, setIsLLMAvailable] = useState(true);

  // Get LLM config from localStorage
  React.useEffect(() => {
    const savedLlmConfig = localStorage.getItem('llmConfig');
    if (savedLlmConfig) {
      try {
        setLlmConfig(JSON.parse(savedLlmConfig));
      } catch (err) {
        console.warn('Failed to parse saved LLM config:', err);
      }
    }
  }, []);

  React.useEffect(() => {
    const check = async () => {
        if (useLLM) {
            const available = await checkLLMAvailability();
            setIsLLMAvailable(available);
        }
    };
    check();
  }, [useLLM]);


  const complexityData: ComplexityData[] = useMemo(() => 
    files.map((file: FileInfo) => ({
      name: file.name,
      path: file.path,
      size: file.size,
      complexity: file.complexity || 0,
      dependenciesCount: file.dependencies?.length || 0,
      contributorsCount: file.contributors?.length || 0,
      commitCount: file.commitCount || 0,
      type: file.type || 'file'
    })), [files]);


  const getComplexityColor = (complexity: number) => {
    if (complexity >= 80) return '#EF4444'; 
    if (complexity >= 60) return '#F59E0B'; 
    if (complexity >= 40) return '#10B981'; 
    return '#3B82F6'; 
  };

  const diagramsOptions = [ 
    {
      id: 'dependency',
      title: 'Dependency Graph',
      description: 'Module and file dependencies',
      icon: <TrendingUp />
    },
    {
      id: 'architecture',
      title: 'System Architecture',
      description: 'High-level overview of components',
      icon: <Layers />
    },
    {
      id: 'vulnerability',
      title: 'Vulnerability Distribution',
      description: 'Security vulnerabilities by severity',
      icon: <Shield />
    },
    {
      id: 'complexity',
      title: 'Complexity Scatter Plot',
      description: 'File complexity vs. size/changes',
      icon: <Target />
    }
  ];
  
  const architectureDiagramFileInfo = React.useMemo(() => {
    const info: Record<string, FileInfo> = {}; // Changed ExtendedFileInfo to FileInfo
    (files || []).forEach(file => {
      info[file.path] = { 
        ...file,
        content: file.content || '',
        language: file.language || 'unknown',
        complexity: file.complexity || 0,
        testCoverage: file.testCoverage || 0,
        lastModified: file.lastModified || new Date(0).toISOString(),
        primaryAuthor: file.primaryAuthor || 'N/A',
        type: file.type || 'file',
        dependencies: file.dependencies || [],
        contributors: file.contributors || [],
        commitCount: file.commitCount || 0,
        functions: file.functions || [],
      };
    });
    return info;
  }, [files]);

  const generateMermaidFromFiles = (filesForDiagram: FileInfo[]): string => {
    if (!filesForDiagram || filesForDiagram.length === 0) return 'graph TD\n  A["No files to display"];';
    
    let mermaidString = 'graph TD;\n';
    const MAX_NODES_FOR_MERMAID = 30; 
    const nodesAdded = new Set<string>();

    const mainDirs = new Set<string>();
    filesForDiagram.forEach(file => {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        mainDirs.add(parts[0]); 
        if (parts.length > 2) {
            mainDirs.add(parts.slice(0, 2).join('/')); 
        }
      }
    });

    Array.from(mainDirs).slice(0, MAX_NODES_FOR_MERMAID / 2).forEach(dir => {
        const nodeId = dir.replace(/[^a-zA-Z0-9_]/g, '_');
        if (!nodesAdded.has(nodeId)) {
            mermaidString += `  ${nodeId}["${dir}"]\n`;
            nodesAdded.add(nodeId);
        }
    });
    
    filesForDiagram
      .sort((a, b) => (b.complexity || 0) + b.size - ((a.complexity || 0) + a.size))
      .slice(0, MAX_NODES_FOR_MERMAID - nodesAdded.size)
      .forEach(file => {
        const nodeId = file.path.replace(/[^a-zA-Z0-9_]/g, '_');
        if (!nodesAdded.has(nodeId)) {
            mermaidString += `  ${nodeId}["${file.name}<br/><small>${file.path}</small>"]\n`;
            nodesAdded.add(nodeId);
        }
        const dirParts = file.path.split('/');
        if (dirParts.length > 1) {
            const parentDir = dirParts.slice(0, dirParts.length-1 > 1 ? 2 : 1).join('/');
            const parentNodeId = parentDir.replace(/[^a-zA-Z0-9_]/g, '_');
            if (nodesAdded.has(parentNodeId) && nodesAdded.has(nodeId)) {
                mermaidString += `  ${parentNodeId} --> ${nodeId}\n`;
            }
        }
      });

    filesForDiagram.slice(0, 10).forEach(file => {
      const sourceNodeId = file.path.replace(/[^a-zA-Z0-9_]/g, '_');
      if (nodesAdded.has(sourceNodeId) && file.dependencies) {
        file.dependencies.slice(0, 2).forEach(depPath => {
          const targetNodeId = depPath.replace(/[^a-zA-Z0-9_]/g, '_');
          if (nodesAdded.has(targetNodeId)) {
            mermaidString += `  ${sourceNodeId} --> ${targetNodeId}\n`;
          }
        });
      }
    });
    return mermaidString;
  };

  const dynamicMermaidDiagram = React.useMemo(() => generateMermaidFromFiles(files || []), [files]);

  const renderDiagram = () => {
    switch (selectedDiagram) {
      case 'complexity': {
        return (
          <div className="w-full h-full min-h-[500px]">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">File Complexity vs. Size</h4>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid />
                <XAxis type="number" dataKey="size" name="Size (bytes)" unit="b" tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="complexity" name="Complexity Score" unit="%" tick={{ fontSize: 10 }} />
                <ZAxis type="number" dataKey="commitCount" range={[50, 500]} name="Commit Count" unit=" commits" />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Files" data={complexityData.filter(d => d.size > 0 && d.complexity > 0)} fillOpacity={0.7}>
                  {complexityData.filter(d => d.size > 0 && d.complexity > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getComplexityColor(entry.complexity)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      }

      case 'dependency': {
        const visNodes: VisDependencyNode[] = (files || []).map(file => ({
          id: file.path,
          name: file.name,
          type: file.type || 'file',
          size: file.size,
          metrics: {
            complexity: file.complexity ?? 0,
            dependencies: file.dependencies?.length ?? 0,
            dependents: 0, 
            lastModified: file.lastModified ?? new Date().toISOString(),
            linesOfCode: file.content?.split('\n').length || 0, // Added linesOfCode
            commitCount: file.commitCount || 0, // Added commitCount
          },
        }));

        const nodeMap = new Map(visNodes.map(node => [node.id, node]));
        
        const links: VisDependencyLink[] = [];
        (files || []).forEach(file => {
          if (file.dependencies) {
            file.dependencies.forEach(depPath => {
              const sourceNode = nodeMap.get(file.path);
              const targetNode = nodeMap.get(depPath); 
              if (sourceNode && targetNode) {
                links.push({ 
                  source: sourceNode,
                  target: targetNode,
                  type: 'depends-on',
                  strength: 1
                } as VisDependencyLink);
              }
            });
          }
        });

        return ( 
          <div className="w-full h-full min-h-[500px]">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Dependency Network</h4>
            <DependencyGraph
              nodes={visNodes}
              links={links}
              // Assuming DependencyGraphProps does not take width/height directly
              // and style props are part of its internal logic or passed differently.
              // Refer to DependencyGraph.tsx for correct props.
              // For now, removing these props to fix TS errors.
              // colorScheme={defaultDependencyConfig.style.colorScheme} // Example: if this was a direct prop
            />
          </div>
        );
      }
      
      case 'architecture':
        return (
          <div className="w-full h-full min-h-[600px]">            <ArchitectureDiagram
              title="System Architecture"
              description="High-level overview of the system components and their interactions"
              diagram={dynamicMermaidDiagram} 
              width={800}
              height={600}
              interactive={true}
              fileInfo={architectureDiagramFileInfo} 
              showDetails={true}
              useLLM={useLLM}
              llmConfig={llmConfig as unknown as Record<string, unknown> || undefined}
            />
          </div>
        );      case 'vulnerability': {
        // Use dependency metrics if available, otherwise fall back to basic metrics
        const vulnerabilityData = dependencyMetrics?.vulnerabilityDistribution || [ 
          { severity: 'Critical', count: metrics.criticalVulnerabilities || 0, color: '#DC2626' },
          { severity: 'High', count: metrics.highVulnerabilities || 0, color: '#F59E0B' },
          { severity: 'Medium', count: metrics.mediumVulnerabilities || 0, color: '#FBBF24' },
          { severity: 'Low', count: metrics.lowVulnerabilities || 0, color: '#3B82F6' }
        ].filter(v => v.count > 0); 

        if (vulnerabilityData.length === 0) {
          return (
            <div className="text-center p-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-600 mb-2">No Vulnerabilities Found</h4>
              <p className="text-gray-500">Great news! No security vulnerabilities were detected in your dependencies.</p>
            </div>
          );
        }

        return (
          <div className="w-full space-y-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Vulnerability Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vulnerabilityData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="severity" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="count" name="Vulnerabilities">
                    {vulnerabilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Add dependency metrics display if available */}
            {dependencyMetrics && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <DependencyMetricsDisplay
                  config={defaultDependencyConfig}
                  currentMetrics={{
                    totalDependencies: dependencyMetrics.totalDependencies,
                    devDependencies: dependencyMetrics.devDependencies,
                    outdatedPackages: dependencyMetrics.outdatedPackages,
                    vulnerablePackages: dependencyMetrics.vulnerablePackages,
                    criticalVulnerabilities: dependencyMetrics.criticalVulnerabilities,
                    highVulnerabilities: dependencyMetrics.highVulnerabilities,
                    lastScan: dependencyMetrics.lastScan,
                    dependencyScore: dependencyMetrics.dependencyScore
                  }}
                />
              </div>
            )}
          </div>        );
      }
      default:
        return <div className="p-8 text-center text-gray-500">Select a diagram to view.</div>;
    }
  };

  return (
    <div className="space-y-8">
      {architectureAnalysis && (
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Brain className="w-6 h-6 text-blue-500 mr-3" />
            AI Architecture Analysis
          </h3>
          <div className="prose prose-indigo max-w-none">
            <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-2xl p-8 mb-8 shadow-2xl overflow-auto transform transition-all duration-500 hover:scale-[1.01] hover:shadow-3xl max-h-[500px]">
              <div className="absolute inset-0 bg-pattern opacity-10"></div> {/* Subtle pattern overlay */}
              {architectureAnalysis.includes('LLM service unavailable') || architectureAnalysis.includes('quota exhaustion') || architectureAnalysis.length < 100 ? (
                <div className="text-white text-lg md:text-xl leading-relaxed font-medium relative z-10 space-y-3">
                  <p>Full AI analysis is currently unavailable or limited due to service constraints. Please try again later for detailed insights.</p>
                  <p>Below is a summary of basic architecture metrics extracted from the analysis data:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="w-3 h-3 bg-white rounded-full mt-2 mr-3 flex-shrink-0 animate-bounce-slow"></span>
                      <span>Total Modules: {files.length || 'N/A'}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-3 h-3 bg-white rounded-full mt-2 mr-3 flex-shrink-0 animate-bounce-slow"></span>
                      <span>Total Dependencies: {files.reduce((sum, file) => sum + (file.dependencies?.length || 0), 0) || 'N/A'}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-3 h-3 bg-white rounded-full mt-2 mr-3 flex-shrink-0 animate-bounce-slow"></span>
                      <span>Average Complexity: {files.length > 0 ? (files.reduce((sum, file) => sum + (file.complexity || 0), 0) / files.length).toFixed(2) : 'N/A'}%</span>
                    </li>
                  </ul>
                  <p>You can also view additional architecture details and diagrams below.</p>
                </div>
              ) : (
                <ul className="text-white text-lg md:text-xl leading-relaxed font-medium relative z-10 space-y-3">
                  {architectureAnalysis
                    .replace(/\*\*/g, '') // Remove bold markdown
                    .split('\n')
                    .map(line => line.replace(/^\s*(\d+\.|\*|-)\s*/, '').trim()) // Remove list markers
                    .filter(line => line.length > 0)
                    .map((line, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-3 h-3 bg-white rounded-full mt-2 mr-3 flex-shrink-0 animate-bounce-slow"></span>
                        <span>{line}</span>
                      </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Layers className="w-6 h-6 text-purple-500 mr-3" />
          Interactive Architecture Visualizations
        </h3>

        <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
          {diagramsOptions.map((diagram: { id: string; title: string; icon: React.ReactElement }) => (
            <button
              key={diagram.id}
              onClick={() => setSelectedDiagram(diagram.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 ${
                selectedDiagram === diagram.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {React.cloneElement(diagram.icon as React.ReactElement, { className: "w-4 h-4" })}
              <span>{diagram.title}</span>
            </button>
          ))}
        </div>
        
        {selectedDiagram === 'architecture' && (
            <div className="mb-4 flex items-center justify-end gap-2">
                <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
                <input
                    type="checkbox"
                    checked={useLLM}
                    onChange={(e) => setUseLLM(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    disabled={!isLLMAvailable && useLLM} 
                />
                Use AI Enhancement
                </label>
                {!isLLMAvailable && useLLM && (
                    <Tooltip content="LLM service is not available. Basic diagram is shown.">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    </Tooltip>
                )}
            </div>
        )}


        <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 min-h-[400px] md:min-h-[500px] flex items-center justify-center">
          {renderDiagram()}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Target className="w-6 h-6 text-red-500 mr-3" />
            Code Hotspots
          </h3>
          {(hotspots && hotspots.length > 0) ? (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {hotspots.slice(0, 10).map((hotspot, index) => ( 
                <div 
                  key={`${hotspot.file}-${index}`}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-800 text-sm truncate" title={hotspot.path}>
                      {hotspot.file}
                    </h4>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      hotspot.complexity >= 80 ? 'bg-red-100 text-red-700' :
                      hotspot.complexity >= 60 ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {hotspot.complexity}% complex
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    Path: <span className="italic truncate block" title={hotspot.path}>{hotspot.path}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">{hotspot.changes}</span> recent changes, Risk: <span className={`font-medium ${hotspot.riskLevel === 'critical' || hotspot.riskLevel === 'high' ? 'text-red-600' : 'text-yellow-600'}`}>{hotspot.riskLevel}</span>
                  </div>
                  {hotspot.explanation && (
                    <p className="text-xs text-gray-700 mt-2 leading-relaxed line-clamp-2" title={hotspot.explanation}>
                      {hotspot.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No significant hotspots identified or data not available.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Shield className="w-6 h-6 text-green-500 mr-3" />
            Dependencies & Security Overview
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Dependency Rules (Default)</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <InfoItem label="Max Dependencies" value={defaultDependencyConfig.rules.maxDependencies.toString()} />
                <InfoItem label="Auto Update" value={defaultDependencyConfig.versioning.autoUpdate ? 'Enabled' : 'Disabled'} />
                <InfoItem label="Allowed Licenses" value={defaultDependencyConfig.rules.allowedLicenses.slice(0,2).join(', ') + (defaultDependencyConfig.rules.allowedLicenses.length > 2 ? '...' : '')} />
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Security Config (Default)</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <InfoItem label="Rate Limiting" value={`${defaultSecurityConfig.rateLimit.max} reqs / ${defaultSecurityConfig.rateLimit.windowMs / 60000} min`} />
                <InfoItem label="Min Password Length" value={defaultSecurityConfig.password.minLength.toString()} />
                <InfoItem label="Max File Upload" value={`${defaultSecurityConfig.fileUpload.maxSize / (1024*1024)}MB`} />
              </div>
            </div>
             {securityIssues && securityIssues.length > 0 && (
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Top Security Issues Found:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-600 max-h-40 overflow-y-auto">
                        {securityIssues.slice(0,3).map((issue,idx) => (
                            <li key={idx} title={`${issue.file}${issue.line ? ':'+issue.line : ''} - ${issue.description}`}>{issue.description.substring(0,60)}... ({issue.severity})</li>
                        ))}
                         {securityIssues.length > 3 && <li>And {securityIssues.length - 3} more...</li>}
                    </ul>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom Tooltip for Complexity Chart
const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ComplexityData;
    return (
      <div className="p-3 bg-white rounded-lg border shadow-lg text-xs">
        <p className="font-bold text-gray-800 mb-1">{data.name}</p>
        <p className="text-gray-600">Path: {data.path}</p>
        <p className="text-gray-600">Size: {data.size.toLocaleString()} bytes</p>
        <p className="text-gray-600">Complexity: {data.complexity}%</p>
        <p className="text-gray-600">Commits: {data.commitCount || 'N/A'}</p>
        <p className="text-gray-600">Type: {data.type}</p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Hotspot Chart
// The CustomHotspotTooltip and its interface HotspotChartPayload are not used.
// Removing them to clear errors.
// Removing it to clear the ESLint error. If it's needed, ensure it's correctly invoked.
// interface CustomHotspotTooltipProps extends TooltipProps<number, string> {
//   getComplexityColor: (complexity: number) => string;
// }

// const CustomHotspotTooltip: React.FC<CustomHotspotTooltipProps> = ({ active, payload, getComplexityColor }) => {
//   if (active && payload && payload.length) {
//     const data = payload[0].payload as HotspotChartPayload;
//     return (
//       <div className="p-3 bg-white rounded-lg border shadow-lg text-xs max-w-xs">
//         <p className="font-bold text-gray-800 mb-1">{data.name}</p>
//         <p className="text-gray-600 truncate" title={data.path}>Path: {data.path}</p>
//         <p className="text-gray-600">Complexity: {data.complexity}%</p>
//         <p className="text-gray-600">Changes: {data.changes}</p>
//         <p className="text-gray-600">Size (LoC): {data.size.toLocaleString()}</p>
//         <p className="text-gray-600">Risk: <span style={{color: getComplexityColor(data.complexity)}}>{data.riskLevel}</span></p>
//         {data.explanation && <p className="text-gray-600 mt-1 line-clamp-2">Note: {data.explanation}</p>}
//       </div>
//     );
//   }
//   return null;
// };

// Simple custom Tooltip component
interface CustomAppTooltipProps {
  content: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<CustomAppTooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);
  const showTooltip = () => setVisible(true);
  const hideTooltip = () => setVisible(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {visible && (
        <div 
          className="absolute z-10 px-2 py-1 text-xs text-white bg-gray-700 rounded-md shadow-lg whitespace-nowrap"
          style={{ bottom: '125%', left: '50%', transform: 'translateX(-50%)' }} 
        >
          {content}
          <div 
            className="absolute w-2 h-2 bg-gray-700 transform rotate-45"
            style={{ bottom: '-4px', left: '50%', marginLeft: '-4px' }} 
          />
        </div>
      )}
    </div>
  );
};


const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-gray-50 p-3 rounded-lg">
    <span className="font-medium text-gray-600">{label}:</span>
    <span className="ml-2 text-gray-900">{value}</span>
  </div>
);


export default ArchitecturePage;
