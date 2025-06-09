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
import { AnalysisResult } from '../../types';
import DependencyGraph from '../diagrams/DependencyGraph';
import ArchitectureDiagram from '../diagrams/ArchitectureDiagram';

interface ArchitecturePageProps {
  reportData: AnalysisResult;
}

const ArchitecturePage = ({ reportData }: ArchitecturePageProps) => {
  const [selectedDiagram, setSelectedDiagram] = useState<string>('treemap');
  
  const { hotspots, keyFunctions, architectureAnalysis, files, languages } = reportData;

  // Mock data for visualizations (in a real implementation, this would be generated from actual code analysis)
  const dependencyData = [
    { name: 'react', type: 'production', version: '^18.2.0', vulnerabilities: 0 },
    { name: 'typescript', type: 'dev', version: '^5.0.0', vulnerabilities: 0 },
    { name: 'lodash', type: 'production', version: '^4.17.21', vulnerabilities: 1 },
    { name: 'axios', type: 'production', version: '^1.6.0', vulnerabilities: 0 },
    { name: 'express', type: 'production', version: '^4.18.0', vulnerabilities: 2 }
  ];

  const complexityData = files.slice(0, 20).map((file, index) => ({
    name: file.name,
    path: file.path,
    complexity: Math.floor(Math.random() * 80) + 20,
    size: file.size,
    churn: Math.floor(Math.random() * 50) + 5
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
    }
  ];

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
            {selectedDiagram === 'treemap' && (
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
            )}

            {selectedDiagram === 'dependency' && (
              <div className="w-full h-full min-h-[500px]">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Dependency Network</h4>
                <DependencyGraph
                  nodes={[
                    { id: '1', name: 'App.tsx', type: 'file', size: 2 },
                    { id: '2', name: 'Dashboard.tsx', type: 'file', size: 1.5 },
                    { id: '3', name: 'UserService.ts', type: 'file', size: 1 },
                    { id: '4', name: 'react', type: 'package', size: 3 },
                    { id: '5', name: 'd3', type: 'package', size: 2 },
                    { id: '6', name: 'utils', type: 'module', size: 1.5 }
                  ]}
                  links={[
                    { source: { id: '1', name: 'App.tsx', type: 'file', size: 2 }, target: { id: '4', name: 'react', type: 'package', size: 3 }, type: 'import', strength: 2 },
                    { source: { id: '1', name: 'App.tsx', type: 'file', size: 2 }, target: { id: '5', name: 'd3', type: 'package', size: 2 }, type: 'import', strength: 1 },
                    { source: { id: '2', name: 'Dashboard.tsx', type: 'file', size: 1.5 }, target: { id: '3', name: 'UserService.ts', type: 'file', size: 1 }, type: 'import', strength: 1.5 },
                    { source: { id: '2', name: 'Dashboard.tsx', type: 'file', size: 1.5 }, target: { id: '4', name: 'react', type: 'package', size: 3 }, type: 'import', strength: 1 },
                    { source: { id: '3', name: 'UserService.ts', type: 'file', size: 1 }, target: { id: '6', name: 'utils', type: 'module', size: 1.5 }, type: 'import', strength: 1 },
                    { source: { id: '5', name: 'd3', type: 'package', size: 2 }, target: { id: '6', name: 'utils', type: 'module', size: 1.5 }, type: 'dependency', strength: 0.5 }
                  ]}
                  width={800}
                  height={600}
                />
              </div>
            )}

            {selectedDiagram === 'complexity' && (
              <div className="w-full h-full min-h-[500px]">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Complexity vs Size Scatter Plot</h4>
                <div className="relative h-full bg-white rounded-lg border overflow-auto">
                  <svg className="w-full h-full min-w-[800px] min-h-[500px]">
                    {complexityData.map((file, index) => (
                      <circle
                        key={index}
                        cx={50 + (file.size / 2000) * 300}
                        cy={300 - (file.complexity / 100) * 250}
                        r={Math.max(3, file.churn / 10)}
                        fill={getComplexityColor(file.complexity)}
                        opacity={0.7}
                        className="hover:opacity-100 cursor-pointer"
                      >
                        <title>{`${file.name}: ${file.complexity}% complexity, ${file.size} bytes`}</title>
                      </circle>
                    ))}
                  </svg>
                  <div className="absolute bottom-2 left-2 text-xs text-gray-500">File Size →</div>
                  <div className="absolute top-2 left-2 text-xs text-gray-500 transform -rotate-90 origin-left">Complexity ↑</div>
                </div>
              </div>
            )}

            {selectedDiagram === 'architecture' && (
              <div className="w-full h-full">
                <ArchitectureDiagram
                  title="System Architecture"
                  description="High-level overview of the system components and their interactions"
                  diagram={`
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

                      %% File-to-file connections
                      UI --> |"src/components/UI.tsx"| State
                      State --> |"src/store/index.ts"| Router
                      Router --> |"src/routes/index.tsx"| API
                      API --> |"src/api/gateway.ts"| Auth
                      Auth --> |"src/auth/index.ts"| Cache
                      Cache --> |"src/cache/redis.ts"| UserSvc
                      Cache --> |"src/cache/redis.ts"| DataSvc
                      Cache --> |"src/cache/redis.ts"| FileSvc
                      UserSvc --> |"src/services/user.ts"| DB
                      DataSvc --> |"src/services/data.ts"| DB
                      FileSvc --> |"src/services/file.ts"| S3

                      classDef frontend fill:#4299e1,stroke:#2b6cb0,color:white
                      classDef backend fill:#48bb78,stroke:#2f855a,color:white
                      classDef service fill:#ed8936,stroke:#c05621,color:white
                      classDef storage fill:#9f7aea,stroke:#6b46c1,color:white

                      class UI,State,Router frontend
                      class API,Auth,Cache backend
                      class UserSvc,DataSvc,FileSvc service
                      class DB,S3 storage
                  `}
                  width={1000}
                  height={800}
                  theme="default"
                  interactive={true}
                  showDetails={true}
                  fileInfo={{
                    'UI': {
                      path: 'src/components/UI.tsx',
                      type: 'React Component',
                      size: 2450,
                      lastModified: '2024-03-15',
                      complexity: 8,
                      dependencies: ['react', 'react-dom', '@mui/material'],
                      contributors: ['John Doe', 'Jane Smith'],
                      commitCount: 15
                    },
                    'State': {
                      path: 'src/store/index.ts',
                      type: 'State Management',
                      size: 1800,
                      lastModified: '2024-03-14',
                      complexity: 6,
                      dependencies: ['redux', 'redux-toolkit'],
                      contributors: ['John Doe'],
                      commitCount: 8
                    },
                    'Router': {
                      path: 'src/routes/index.tsx',
                      type: 'Routing',
                      size: 1200,
                      lastModified: '2024-03-13',
                      complexity: 4,
                      dependencies: ['react-router-dom'],
                      contributors: ['Jane Smith'],
                      commitCount: 5
                    },
                    'API': {
                      path: 'src/api/gateway.ts',
                      type: 'API Gateway',
                      size: 3200,
                      lastModified: '2024-03-15',
                      complexity: 12,
                      dependencies: ['express', 'cors', 'helmet'],
                      contributors: ['John Doe', 'Mike Johnson'],
                      commitCount: 20
                    },
                    'Auth': {
                      path: 'src/auth/index.ts',
                      type: 'Authentication',
                      size: 2800,
                      lastModified: '2024-03-14',
                      complexity: 10,
                      dependencies: ['passport', 'jwt', 'bcrypt'],
                      contributors: ['Mike Johnson'],
                      commitCount: 12
                    },
                    'Cache': {
                      path: 'src/cache/redis.ts',
                      type: 'Cache Layer',
                      size: 1500,
                      lastModified: '2024-03-13',
                      complexity: 7,
                      dependencies: ['redis', 'ioredis'],
                      contributors: ['Jane Smith', 'Mike Johnson'],
                      commitCount: 9
                    },
                    'UserSvc': {
                      path: 'src/services/user.ts',
                      type: 'Service',
                      size: 4200,
                      lastModified: '2024-03-15',
                      complexity: 15,
                      dependencies: ['mongoose', 'bcrypt', 'jsonwebtoken'],
                      contributors: ['John Doe', 'Jane Smith', 'Mike Johnson'],
                      commitCount: 25
                    },
                    'DataSvc': {
                      path: 'src/services/data.ts',
                      type: 'Service',
                      size: 3800,
                      lastModified: '2024-03-14',
                      complexity: 14,
                      dependencies: ['mongoose', 'redis'],
                      contributors: ['John Doe', 'Mike Johnson'],
                      commitCount: 18
                    },
                    'FileSvc': {
                      path: 'src/services/file.ts',
                      type: 'Service',
                      size: 2900,
                      lastModified: '2024-03-13',
                      complexity: 11,
                      dependencies: ['aws-sdk', 'multer'],
                      contributors: ['Jane Smith'],
                      commitCount: 14
                    }
                  }}
                />
              </div>
            )}
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
    </div>
  );
};

export default ArchitecturePage;