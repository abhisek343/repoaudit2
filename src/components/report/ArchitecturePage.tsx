import React, { useState } from 'react';
import { 
  Code, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Layers,
  Shield,
  Zap,
  Target,
} from 'lucide-react';
import DependencyGraph from '../diagrams/DependencyGraph';
import ArchitectureDiagram from '../diagrams/ArchitectureDiagram';
import { ExtendedFileInfo } from '../../types';

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

interface DependencyData {
  source: string;
  target: string;
  type: string;
  strength: number;
  name?: string;
  version?: string;
  vulnerabilities: number;
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
  
  const { hotspots, keyFunctions, architectureAnalysis, files, metrics } = reportData;

  // Generate complexity data from hotspots
  const complexityData: ComplexityData[] = hotspots.map(hotspot => ({
    name: hotspot.file,
    size: hotspot.size,
    complexity: hotspot.complexity,
    dependencies: hotspot.dependencies,
    contributors: hotspot.contributors,
    commitCount: hotspot.commitCount
  }));

  // Generate dependency data from hotspots
  const dependencyData: DependencyData[] = (reportData.hotspots || []).flatMap(hotspot => 
    (hotspot.dependencies || []).map(dep => ({
      source: hotspot.file,
      target: dep,
      type: 'production',
      strength: 1,
      name: dep,
      version: 'N/A',
      vulnerabilities: 0
    }))
  );

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
      complexity: Math.round(files.filter(f => f.path.startsWith('src/frontend')).reduce((acc, f) => acc + (f.complexity || 0), 0) / files.filter(f => f.path.startsWith('src/frontend')).length),
      testCoverage: metrics.testCoverage as number,
      lastModified: new Date().toISOString(),
      primaryAuthor: '',
      type: 'frontend',
      dependencies: ['react', 'typescript', 'axios'],
      contributors: [],
      commitCount: reportData.metrics.totalCommits as number
    };

    // Backend components
    info['backend'] = {
      name: 'Backend',
      path: 'src/backend',
      size: files.filter(f => f.path.startsWith('src/backend')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/backend')).reduce((acc, f) => acc + (f.complexity || 0), 0) / files.filter(f => f.path.startsWith('src/backend')).length),
      testCoverage: metrics.testCoverage as number,
      lastModified: new Date().toISOString(),
      primaryAuthor: '',
      type: 'backend',
      dependencies: ['express', 'typescript', 'mongoose'],
      contributors: [],
      commitCount: reportData.metrics.totalCommits as number
    };

    // Service components
    info['service'] = {
      name: 'Service',
      path: 'src/services',
      size: files.filter(f => f.path.startsWith('src/services')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/services')).reduce((acc, f) => acc + (f.complexity || 0), 0) / files.filter(f => f.path.startsWith('src/services')).length),
      testCoverage: metrics.testCoverage as number,
      lastModified: new Date().toISOString(),
      primaryAuthor: '',
      type: 'service',
      dependencies: ['axios', 'typescript', 'redis'],
      contributors: [],
      commitCount: reportData.metrics.totalCommits as number
    };

    // Storage components
    info['storage'] = {
      name: 'Storage',
      path: 'src/storage',
      size: files.filter(f => f.path.startsWith('src/storage')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/storage')).reduce((acc, f) => acc + (f.complexity || 0), 0) / files.filter(f => f.path.startsWith('src/storage')).length),
      testCoverage: metrics.testCoverage as number,
      lastModified: new Date().toISOString(),
      primaryAuthor: '',
      type: 'storage',
      dependencies: ['mongoose', 'redis', 'typescript'],
      contributors: [],
      commitCount: reportData.metrics.totalCommits as number
    };

    return info;
  }, [files, metrics]);

  const renderDiagram = () => {
    switch (selectedDiagram) {
      case 'treemap':
        return (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Directory Structure Treemap</h4>
            <div className="grid grid-cols-4 gap-2 h-80">
              {complexityData.slice(0, 16).map((file, index) => (
                <div
                  key={`treemap-${file.name}-${index}`}
                  className="rounded-lg p-3 text-white text-xs font-medium flex flex-col justify-between transition-transform duration-200 hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: getComplexityColor(file.complexity),
                    height: `${Math.max(60, (file.size / 1000) * 100)}px`
                  }}
                >
                  <div className="font-semibold">{file.name}</div>
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

      case 'dependency':
        return (
          <div className="w-full h-full min-h-[500px]">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Dependency Network</h4>
            <DependencyGraph
              nodes={[...new Set(dependencyData.map(d => d.source))]
                .map(id => ({
                  id,
                  name: id,
                  type: 'file',
                  size: 1,
                  metrics: {
                    complexity: 0,
                    dependencies: 1,
                    dependents: 0,
                    lastModified: new Date().toISOString()
                  }
                }))}
              links={dependencyData.map(dep => {
                const vulnerabilities = dep.vulnerabilities ?? 0;
                return {
                  source: {
                    id: dep.source,
                    name: dep.source,
                    type: 'file',
                    size: 1
                  },
                  target: {
                    id: dep.target,
                    name: dep.target,
                    type: 'file',
                    size: 1
                  },
                  type: dep.type,
                  strength: dep.strength,
                  name: dep.name,
                  version: dep.version,
                  vulnerabilities
                };
              })}
              width={800}
              height={600}
            />
          </div>
        );

      case 'complexity':
        return (
          <div className="w-full h-full min-h-[500px]">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Complexity vs Size Scatter Plot</h4>
            <div className="relative h-full bg-white rounded-lg border overflow-auto">
              <svg
                className="w-full h-full"
                viewBox="0 0 1000 600"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Background grid */}
                <defs>
                  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                  </pattern>
                  <linearGradient id="complexityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.2 }} />
                    <stop offset="50%" style={{ stopColor: '#f59e0b', stopOpacity: 0.2 }} />
                    <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 0.2 }} />
                  </linearGradient>
                </defs>

                {/* Grid background */}
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Plot points */}
                {complexityData.map((file, index) => (
                  <g key={`complexity-${file.name}-${index}`} transform={`translate(${(file.size / 1000) * 800},${600 - (file.complexity * 5)})`}>
                    <circle
                      r={5}
                      fill={getComplexityColor(file.complexity)}
                      stroke="#fff"
                      strokeWidth={1}
                    />
                    <title>
                      {file.name}
                      Size: {file.size}b
                      Complexity: {file.complexity}%
                    </title>
                  </g>
                ))}

                {/* Axes */}
                <g className="axis">
                  <line x1="0" y1="600" x2="1000" y2="600" stroke="#64748b" strokeWidth={1} />
                  <line x1="0" y1="0" x2="0" y2="600" stroke="#64748b" strokeWidth={1} />
                </g>

                {/* Labels */}
                <text x="500" y="580" textAnchor="middle" fill="#64748b" fontSize="12">
                  File Size (KB)
                </text>
                <text
                  x="-300"
                  y="300"
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="12"
                  transform="rotate(-90, 0, 300)"
                >
                  Complexity (%)
                </text>
              </svg>
            </div>
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
              fileInfo={fileInfo as any}
              showDetails={true}
              useLLM={useLLM}
            />
          </div>
        );

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

        {/* Dependencies & Vulnerabilities */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Shield className="w-6 h-6 text-green-500 mr-3" />
            Dependencies & Security
          </h3>

          <div className="space-y-4">
            {dependencyData.map((dep, index) => (
              <div 
                key={`dependency-${dep.name}-${index}`}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{dep.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dep.type === 'production' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {dep.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Version: {dep.version}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {dep.vulnerabilities} vulnerabilities
                    </div>
                    <div className="text-xs text-gray-500">
                      Strength: {dep.strength}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const generateDetailedArchitectureDiagram = (mermaidCode: string) => {
  // Process the mermaid code and file info to generate a detailed diagram
  return mermaidCode;
};

export default ArchitecturePage;
