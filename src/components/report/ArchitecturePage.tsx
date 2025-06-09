import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps, BarChart, Bar, Cell } from 'recharts';
import { 
  TrendingUp,
  Layers,
  Shield,
  Target,
} from 'lucide-react';
import DependencyGraph, { DependencyNode, DependencyLink } from '../diagrams/DependencyGraph';
import ArchitectureDiagram from '../diagrams/ArchitectureDiagram';
import { ExtendedFileInfo } from '../../types';
import { defaultDependencyConfig } from '../../config/dependencies.config';
import { defaultSecurityConfig } from '../../config/security.config';

interface ComplexityData {
  name: string;
  size: number;
  complexity: number;
  lastModified?: string;
  dependencies?: string[];
  contributors?: string[];
  commitCount?: number;
}

interface Hotspot {
  file: string;
  complexity: number;
  size: number;
  dependencies: string[];
  contributors: string[];
  commitCount: number;
  changes: number;
  explanation: string;
}

interface ArchitecturePageProps {
  reportData: {
    hotspots: Hotspot[];
    keyFunctions: Record<string, unknown>[];
    architectureAnalysis: string;
    files: ExtendedFileInfo[];
    languages: Record<string, unknown>[];
    metrics: Record<string, unknown>;
  };
}

const ArchitecturePage: React.FC<ArchitecturePageProps> = ({ reportData }) => {
  const [selectedDiagram, setSelectedDiagram] = useState<string>('treemap');
  const [useLLM, setUseLLM] = useState(true);
  
  const { hotspots, architectureAnalysis, metrics, files } = reportData;

  // Generate complexity data from all files
  const complexityData: ComplexityData[] = files.map((file: ExtendedFileInfo) => ({
    name: file.name,
    size: file.size,
    complexity: file.complexity || 0,
    dependencies: file.dependencies || [],
    contributors: file.contributors || [],
    commitCount: file.commitCount || 0
  }));


  const getComplexityColor = (complexity: number) => {
    if (complexity >= 80) return '#EF4444';
    if (complexity >= 60) return '#F59E0B';
    if (complexity >= 40) return '#10B981';
    return '#3B82F6';
  };

  const diagrams = [
    {
      id: 'treemap',
      title: 'Directory Treemap',
      description: 'File sizes and complexity visualization'
    },
    {
      id: 'dependency',
      title: 'Dependency Graph',
      description: 'Package dependencies and relationships'
    },
    {
      id: 'complexity',
      title: 'Complexity Scatter Plot',
      description: 'Code complexity vs file size analysis'
    },
    {
      id: 'architecture',
      title: 'Architecture Diagram',
      description: 'System architecture overview'
    },
    {
      id: 'vulnerability',
      title: 'Vulnerability Chart',
      description: 'Vulnerability distribution by severity'
    },
    {
      id: 'hotspot',
      title: 'Hotspot Analysis',
      description: 'Interactive hotspot visualization'
    }
  ];

  const fileInfo = React.useMemo(() => {
    const info: Record<string, ExtendedFileInfo> = {} as Record<string, ExtendedFileInfo>;
    
    // Frontend components
    info['frontend'] = {
      name: 'Frontend',
      path: 'src/frontend',
      size: files.filter(f => f.path.startsWith('src/frontend')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/frontend')).reduce((acc, f) => acc + (f.complexity || 0), 0) / (files.filter(f => f.path.startsWith('src/frontend')).length || 1)),
      testCoverage: metrics.testCoverage as number,
      lastModified: new Date().toISOString(),
      primaryAuthor: '',
      type: 'frontend',
      dependencies: files.filter(f => f.path.startsWith('src/frontend')).flatMap(f => f.dependencies || []),
      contributors: [],
      commitCount: metrics.totalCommits as number
    };

    // Backend components
    info['backend'] = {
      name: 'Backend',
      path: 'src/backend',
      size: files.filter(f => f.path.startsWith('src/backend')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/backend')).reduce((acc, f) => acc + (f.complexity || 0), 0) / (files.filter(f => f.path.startsWith('src/backend')).length || 1)),
      testCoverage: metrics.testCoverage as number,
      lastModified: new Date().toISOString(),
      primaryAuthor: '',
      type: 'backend',
      dependencies: files.filter(f => f.path.startsWith('src/backend')).flatMap(f => f.dependencies || []),
      contributors: [],
      commitCount: metrics.totalCommits as number
    };

    // Service components
    info['service'] = {
      name: 'Service',
      path: 'src/services',
      size: files.filter(f => f.path.startsWith('src/services')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/services')).reduce((acc, f) => acc + (f.complexity || 0), 0) / (files.filter(f => f.path.startsWith('src/services')).length || 1)),
      testCoverage: metrics.testCoverage as number,
      lastModified: new Date().toISOString(),
      primaryAuthor: '',
      type: 'service',
      dependencies: files.filter(f => f.path.startsWith('src/services')).flatMap(f => f.dependencies || []),
      contributors: [],
      commitCount: metrics.totalCommits as number
    };

    // Storage components
    info['storage'] = {
      name: 'Storage',
      path: 'src/storage',
      size: files.filter(f => f.path.startsWith('src/storage')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/storage')).reduce((acc, f) => acc + (f.complexity || 0), 0) / (files.filter(f => f.path.startsWith('src/storage')).length || 1)),
      testCoverage: metrics.testCoverage as number,
      lastModified: new Date().toISOString(),
      primaryAuthor: '',
      type: 'storage',
      dependencies: files.filter(f => f.path.startsWith('src/storage')).flatMap(f => f.dependencies || []),
      contributors: [],
      commitCount: metrics.totalCommits as number
    };

    return info;
  }, [files, metrics]);

  const renderDiagram = () => {
    switch (selectedDiagram) {
      case 'treemap': {
        const visibleFiles = complexityData.slice(0, 16);
        const maxFileSize = Math.max(...visibleFiles.map(f => f.size), 1);
        return (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Directory Structure Treemap</h4>
            <div className="grid grid-cols-4 gap-2 h-80">
              {visibleFiles.map((file, index) => (
                <div
                  key={`treemap-${file.name}-${index}`}
                  className="rounded-lg p-3 text-white text-xs font-medium flex flex-col justify-between transition-transform duration-200 hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: getComplexityColor(file.complexity),
                    height: `${Math.max(60, (file.size / maxFileSize) * 120)}px`
                  }}
                >
                  <div className="font-semibold">{file.name.split('/').pop()}</div>
                  <div className="text-xs opacity-90">
                    <div>Size: {file.size}b</div>
                    <div>Complexity: {file.complexity}%</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Size represents file size, color represents complexity level
            </div>
          </div>
        );
      }

      case 'dependency': {
        const nodes: DependencyNode[] = files.map(file => ({
          id: file.path,
          name: file.name,
          type: file.type,
          size: file.size,
          metrics: {
            complexity: file.complexity ?? 0,
            dependencies: file.dependencies?.length ?? 0,
            dependents: 0,
            lastModified: file.lastModified ?? new Date().toISOString()
          }
        }));

        const nodeMap = new Map(nodes.map(node => [node.id, node]));

        const links: DependencyLink[] = [];
        files.forEach(file => {
          if (file.dependencies) {
            file.dependencies.forEach(dep => {
              const sourceNode = nodeMap.get(file.path);
              const targetNode = nodeMap.get(dep);
              if (sourceNode && targetNode) {
                links.push({
                  source: sourceNode,
                  target: targetNode,
                  type: 'depends-on',
                  strength: 1
                });
              }
            });
          }
        });

        return (
          <div className="w-full h-full min-h-[500px]">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Dependency Network</h4>
            <DependencyGraph
              nodes={nodes}
              links={links}
            />
          </div>
        );
      }

      case 'complexity':
        return (
          <div className="w-full h-full min-h-[500px]">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Complexity vs Size Scatter Plot</h4>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart
                margin={{
                  top: 20,
                  right: 20,
                  bottom: 20,
                  left: 20,
                }}
              >
                <CartesianGrid />
                <XAxis type="number" dataKey="size" name="size" unit="b" />
                <YAxis type="number" dataKey="complexity" name="complexity" unit="%" />
                <ZAxis type="number" dataKey="size" range={[100, 1000]} name="size" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Legend />
                <Scatter name="Files" data={complexityData} fill="#8884d8">
                  {complexityData.map((entry, index) => (
                    <circle key={`cell-${index}`} cx={entry.size} cy={entry.complexity} r={5} fill={getComplexityColor(entry.complexity)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );

      case 'architecture':
        return (
          <div className="w-full h-full">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">System Architecture</h4>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={useLLM}
                    onChange={(e) => setUseLLM(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Use AI Enhancement
                </label>
              </div>
            </div>
            <ArchitectureDiagram
              title="System Architecture"
              description="High-level overview of the system components and their interactions"
              diagram={generateDetailedArchitectureDiagram(`
                graph TB
                  subgraph Frontend
                    UI["UI<br/>src/components/UI.tsx"]
                    State["State<br/>src/store/index.ts"]
                    Router["Router<br/>src/routes/index.tsx"]
                  end

                  subgraph Backend
                    API["API Gateway<br/>src/api/gateway.ts"]
                    Auth["Authentication<br/>src/auth/index.ts"]
                    Cache["Cache Layer<br/>src/cache/redis.ts"]
                  end

                  subgraph Services
                    UserSvc["User Service<br/>src/services/user.ts"]
                    DataSvc["Data Service<br/>src/services/data.ts"]
                    FileSvc["File Service<br/>src/services/file.ts"]
                  end

                  subgraph Storage
                    DB[(Database)]
                    S3[(Object Storage)]
                  end

                  %% Frontend connections
                  UI --> State
                  State --> Router
                  Router --> API

                  %% Backend connections
                  API --> Auth
                  Auth --> Cache
                  Cache --> UserSvc
                  Cache --> DataSvc
                  Cache --> FileSvc

                  %% Service connections
                  UserSvc --> DB
                  DataSvc --> DB
                  FileSvc --> S3

                  classDef frontend fill:#4299e1,stroke:#2b6cb0,color:white
                  classDef backend fill:#48bb78,stroke:#2f855a,color:white
                  classDef service fill:#ed8936,stroke:#c05621,color:white
                  classDef storage fill:#9f7aea,stroke:#6b46c1,color:white

                  class UI,State,Router frontend
                  class API,Auth,Cache backend
                  class UserSvc,DataSvc,FileSvc service
                  class DB,S3 storage
              `)}
              width={800}
              height={600}
              interactive={true}
              fileInfo={fileInfo}
              showDetails={true}
              useLLM={useLLM}
            />
          </div>
        );

      case 'vulnerability': {
        const vulnerabilityData = [
          { name: 'Critical', value: metrics.criticalVulnerabilities as number || 0, color: '#DC2626' },
          { name: 'High', value: metrics.highVulnerabilities as number || 0, color: '#F59E0B' },
          { name: 'Medium', value: metrics.mediumVulnerabilities as number || 0, color: '#FBBF24' },
          { name: 'Low', value: metrics.lowVulnerabilities as number || 0, color: '#3B82F6' }
        ];
        return (
          <div className="w-full h-full min-h-[500px]">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Vulnerability Distribution</h4>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={vulnerabilityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  {vulnerabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      }

      case 'hotspot': {
        const hotspotData = hotspots.map(h => ({
          name: h.file,
          complexity: h.complexity,
          size: h.size,
          changes: h.changes
        }));
        return (
          <div className="w-full h-full min-h-[500px]">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Code Hotspots</h4>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis type="number" dataKey="complexity" name="Complexity" unit="%" />
                <YAxis type="number" dataKey="changes" name="Changes" />
                <ZAxis type="number" dataKey="size" name="Size" range={[100, 1000]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Hotspots" data={hotspotData} fill="#DC2626" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      }

      default:
        return <div>Select a diagram to view</div>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Architecture Analysis */}
      {architectureAnalysis && (
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Layers className="w-6 h-6 text-blue-500 mr-3" />
            AI Architecture Analysis
          </h3>
          <div className="prose prose-lg max-w-none">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border-l-4 border-blue-500">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {architectureAnalysis}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Visualizations */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 text-purple-500 mr-3" />
          Interactive Code Visualizations
        </h3>

        {/* Diagram Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {diagrams.map((diagram) => (
            <button
              key={`diagram-${diagram.id}`}
              onClick={() => setSelectedDiagram(diagram.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                selectedDiagram === diagram.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {diagram.title}
            </button>
          ))}
        </div>

        {/* Visualization Content */}
        <div className="relative w-full overflow-hidden rounded-lg border border-gray-200">
          <div className="w-full h-[600px] overflow-auto">
            {renderDiagram()}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Code Hotspots */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Target className="w-6 h-6 text-red-500 mr-3" />
            Code Hotspots
          </h3>

          {hotspots && hotspots.length > 0 ? (
            <div className="space-y-4">
              {hotspots.slice(0, 5).map((hotspot, index) => (
                <div 
                  key={`hotspot-${hotspot.file}-${index}`}
                  className="p-4 border border-gray-200 rounded-lg hover:border-red-300 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {hotspot.file.split('/').pop()}
                    </h4>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      hotspot.complexity >= 80 ? 'bg-red-100 text-red-800' :
                      hotspot.complexity >= 60 ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {hotspot.complexity}% complexity
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    <span className="font-medium">{hotspot.changes}</span> recent changes
                  </div>
                  
                  {hotspot.explanation && (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {hotspot.explanation.substring(0, 150)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No hotspots analyzed</p>
              <p className="text-sm">Configure AI analysis to identify code hotspots</p>
            </div>
          )}
        </div>

        {/* Dependencies & Security */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Shield className="w-6 h-6 text-green-500 mr-3" />
            Dependencies & Security
          </h3>

          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Dependency Rules</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-600">Package Manager:</span>
                  <span className="ml-2 text-gray-900">{defaultDependencyConfig.packageManager}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-600">Max Dependencies:</span>
                  <span className="ml-2 text-gray-900">{defaultDependencyConfig.rules.maxDependencies}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-600">Auto Update:</span>
                  <span className="ml-2 text-gray-900">{defaultDependencyConfig.versioning.autoUpdate ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-600">Allowed Licenses:</span>
                  <span className="ml-2 text-gray-900">{defaultDependencyConfig.rules.allowedLicenses.join(', ')}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Security Configuration</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-600">Rate Limiting:</span>
                  <span className="ml-2 text-gray-900">{defaultSecurityConfig.rateLimit.max} reqs / {defaultSecurityConfig.rateLimit.windowMs / 60000} min</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-600">Min Password Length:</span>
                  <span className="ml-2 text-gray-900">{defaultSecurityConfig.password.minLength}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-600">API Key Required:</span>
                  <span className="ml-2 text-gray-900">{defaultSecurityConfig.api.requireApiKey ? 'Yes' : 'No'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-600">Max File Upload Size:</span>
                  <span className="ml-2 text-gray-900">{defaultSecurityConfig.fileUpload.maxSize / (1024*1024)}MB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ComplexityData;
    return (
      <div className="p-4 bg-white rounded-lg border shadow-lg">
        <p className="text-sm text-gray-900 font-bold">{data.name}</p>
        <p className="text-sm text-gray-600">Size: {data.size}b</p>
        <p className="text-sm text-gray-600">Complexity: {data.complexity}%</p>
        {data.dependencies && <p className="text-sm text-gray-600">Dependencies: {data.dependencies.length}</p>}
        {data.contributors && <p className="text-sm text-gray-600">Contributors: {data.contributors.length}</p>}
        {data.commitCount && <p className="text-sm text-gray-600">Commits: {data.commitCount}</p>}
      </div>
    );
  }

  return null;
};

const generateDetailedArchitectureDiagram = (mermaidCode: string) => {
  // Process the mermaid code and file info to generate a detailed diagram
  return mermaidCode;
};

export default ArchitecturePage;
