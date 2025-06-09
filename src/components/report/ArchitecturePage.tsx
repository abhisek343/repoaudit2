import React, { useState } from 'react';
import { 
  Code, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Layers,
  GitBranch,
  Shield,
  Zap,
  Target,
  Database,
  Globe
} from 'lucide-react';
import { AnalysisResult, FileInfo } from '../../types';
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

interface Contributor {
  name: string;
  email: string;
  login: string;
  commits: number;
  lastCommit: string;
}

interface ArchitecturePageProps {
  reportData: {
    hotspots: Hotspot[];
    keyFunctions: any[];
    architectureAnalysis: string;
    files: ExtendedFileInfo[];
    languages: any[];
    metrics: any;
    contributors: Contributor[];
  };
}

const ArchitecturePage: React.FC<ArchitecturePageProps> = ({ reportData }) => {
  const [selectedDiagram, setSelectedDiagram] = useState<string>('treemap');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [useLLM, setUseLLM] = useState(true);
  
  const { hotspots, keyFunctions, architectureAnalysis, files, languages, metrics, contributors } = reportData;

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
    const info: Record<string, ExtendedFileInfo> = {};
    
    // Frontend components
    info['frontend'] = {
      name: 'Frontend',
      path: 'src/frontend',
      size: files.filter(f => f.path.startsWith('src/frontend')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/frontend')).reduce((acc, f) => acc + (f.complexity || 0), 0) / files.filter(f => f.path.startsWith('src/frontend')).length),
      testCoverage: metrics.testCoverage,
      lastModified: new Date().toISOString(),
      primaryAuthor: reportData.contributors[0]?.login,
      type: 'frontend',
      dependencies: ['react', 'typescript', 'axios'],
      contributors: reportData.contributors.slice(0, 3).map(c => c.login),
      commitCount: reportData.metrics.totalCommits
    };

    // Backend components
    info['backend'] = {
      name: 'Backend',
      path: 'src/backend',
      size: files.filter(f => f.path.startsWith('src/backend')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/backend')).reduce((acc, f) => acc + (f.complexity || 0), 0) / files.filter(f => f.path.startsWith('src/backend')).length),
      testCoverage: metrics.testCoverage,
      lastModified: new Date().toISOString(),
      primaryAuthor: reportData.contributors[0]?.login,
      type: 'backend',
      dependencies: ['express', 'typescript', 'mongoose'],
      contributors: reportData.contributors.slice(0, 3).map(c => c.login),
      commitCount: reportData.metrics.totalCommits
    };

    // Service components
    info['service'] = {
      name: 'Service',
      path: 'src/services',
      size: files.filter(f => f.path.startsWith('src/services')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/services')).reduce((acc, f) => acc + (f.complexity || 0), 0) / files.filter(f => f.path.startsWith('src/services')).length),
      testCoverage: metrics.testCoverage,
      lastModified: new Date().toISOString(),
      primaryAuthor: reportData.contributors[0]?.login,
      type: 'service',
      dependencies: ['axios', 'typescript', 'redis'],
      contributors: reportData.contributors.slice(0, 3).map(c => c.login),
      commitCount: reportData.metrics.totalCommits
    };

    // Storage components
    info['storage'] = {
      name: 'Storage',
      path: 'src/storage',
      size: files.filter(f => f.path.startsWith('src/storage')).reduce((acc, f) => acc + f.size, 0),
      content: undefined,
      language: 'TypeScript',
      complexity: Math.round(files.filter(f => f.path.startsWith('src/storage')).reduce((acc, f) => acc + (f.complexity || 0), 0) / files.filter(f => f.path.startsWith('src/storage')).length),
      testCoverage: metrics.testCoverage,
      lastModified: new Date().toISOString(),
      primaryAuthor: reportData.contributors[0]?.login,
      type: 'storage',
      dependencies: ['mongoose', 'redis', 'typescript'],
      contributors: reportData.contributors.slice(0, 3).map(c => c.login),
      commitCount: reportData.metrics.totalCommits
    };

    return info;
  }, [files, metrics, reportData.contributors, reportData.metrics.totalCommits]);

  const handleNodeClick = (nodeId: string, nodeInfo: ExtendedFileInfo) => {
    console.log('Clicked node:', nodeId, nodeInfo);
    setSelectedNode(nodeId);
  };

  const renderDiagram = () => {
    switch (selectedDiagram) {
      case 'treemap':
        return (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Directory Structure Treemap</h4>
            <div className="grid grid-cols-4 gap-2 h-80">
              {complexityData.slice(0, 16).map((file, index) => (
                <div
                  key={index}
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
   .map(id => ({ id, name: id, type: 'file', size: 1, metrics: {/* … */} }))}
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
                  <g key={index} transform={`translate(${(file.size / 1000) * 800},${600 - (file.complexity * 5)})`}>
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
              `, fileInfo)}
              width={800}
              height={600}
              interactive={true}
              fileInfo={fileInfo}
              showDetails={true}
              useLLM={useLLM}
            />
          </div>
        );

      default:
        return <div>Select a diagram to view</div>;
    }
  };

  const renderContributorStats = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Top Contributors</h4>
          <div className="space-y-2">
            {contributors.slice(0, 5).map((c: Contributor) => (
              <div key={c.email} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{c.name}</span>
                <span className="text-gray-900 font-medium">{c.commits} commits</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Activity</h4>
          <div className="space-y-2">
            {contributors
              .sort((a: Contributor, b: Contributor) => 
                new Date(b.lastCommit).getTime() - new Date(a.lastCommit).getTime()
              )
              .slice(0, 5)
              .map((c: Contributor) => (
                <div key={c.email} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{c.name}</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(c.lastCommit).toLocaleDateString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Commit Distribution</h4>
          <div className="space-y-2">
            {contributors
              .sort((a: Contributor, b: Contributor) => b.commits - a.commits)
              .slice(0, 5)
              .map((c: Contributor) => (
                <div key={c.email} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{c.name}</span>
                  <span className="text-gray-900 font-medium">
                    {((c.commits / contributors.reduce((sum, c) => sum + c.commits, 0)) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
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
              key={diagram.id}
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
                  key={index}
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
                key={index}
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
                  <p className="text-sm text-gray-600">{dep.version}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {dep.vulnerabilities > 0 ? (
                    <div className="flex items-center space-x-1 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">{dep.vulnerabilities}</span>
                    </div>
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h4 className="font-medium text-yellow-800">Security Summary</h4>
            </div>
            <p className="text-sm text-yellow-700">
              Found {dependencyData.reduce((sum, dep) => sum + dep.vulnerabilities, 0)} vulnerabilities 
              across {dependencyData.length} dependencies. Consider updating vulnerable packages.
            </p>
          </div>
        </div>
      </div>

      {/* Key Functions Analysis */}
      {keyFunctions && keyFunctions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Code className="w-6 h-6 text-purple-500 mr-3" />
            Critical Function Analysis
          </h3>

          <div className="grid lg:grid-cols-2 gap-6">
            {keyFunctions.slice(0, 2).map((func, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    <code className="text-purple-600">{func.name}</code>
                  </h4>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    func.complexity >= 70 ? 'bg-red-100 text-red-800' :
                    func.complexity >= 50 ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {func.complexity}% complex
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  in <span className="font-mono">{func.file}</span>
                </p>
                
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    {func.explanation.substring(0, 200)}...
                  </p>
                </div>

                {/* Simple flow diagram */}
                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-3 text-sm">Logic Flow</h5>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>Input</span>
                    <span>Process</span>
                    <span>Output</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Quality Metrics */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Zap className="w-6 h-6 text-yellow-500 mr-3" />
          Code Quality Metrics
        </h3>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  className="text-green-500"
                  strokeDasharray={`${(reportData.metrics.testCoverage / 100) * 201.06} 201.06`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">{reportData.metrics.testCoverage}%</span>
              </div>
            </div>
            <h4 className="font-semibold text-gray-900">Test Coverage</h4>
            <p className="text-sm text-gray-600">Code covered by tests</p>
          </div>

          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  className="text-blue-500"
                  strokeDasharray={`${(reportData.metrics.codeQuality / 10) * 201.06} 201.06`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">{reportData.metrics.codeQuality}/10</span>
              </div>
            </div>
            <h4 className="font-semibold text-gray-900">Code Quality</h4>
            <p className="text-sm text-gray-600">Overall quality score</p>
          </div>

          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  className={reportData.metrics.busFactor <= 2 ? 'text-red-500' : 'text-green-500'}
                  strokeDasharray={`${Math.min(100, (reportData.metrics.busFactor / 5) * 100) * 2.01} 201.06`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">{reportData.metrics.busFactor}</span>
              </div>
            </div>
            <h4 className="font-semibold text-gray-900">Bus Factor</h4>
            <p className="text-sm text-gray-600">Key contributor risk</p>
          </div>
        </div>
      </div>

      {/* Contributor Statistics */}
      {renderContributorStats()}
    </div>
  );
};

export default ArchitecturePage;