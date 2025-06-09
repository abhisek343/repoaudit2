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

interface ComplexityData {
  name: string;
  path: string;
  complexity: number;
  size: number;
  churn: number;
  lastModified?: string;
  dependencies?: string[];
  contributors?: string[];
  commitCount?: number;
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  complexity?: number;
  churn?: number;
  lastModified?: string;
  dependencies?: string[];
  contributors?: string[];
  commitCount?: number;
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

  const complexityData: ComplexityData[] = (reportData.files as FileInfo[])
    .filter(file => file.complexity && file.complexity > 0)
    .map(file => ({
      name: file.name,
      path: file.path,
      complexity: file.complexity || 0,
      size: file.size,
      churn: file.churn || 0,
      lastModified: file.lastModified,
      dependencies: file.dependencies,
      contributors: file.contributors,
      commitCount: file.commitCount
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
                      {/* Arrow marker for file dependencies */}
                      <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="5"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                      </marker>
                    </defs>

                    {/* Grid background */}
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Gradient background for complexity zones */}
                    <rect x="0" y="0" width="1000" height="600" fill="url(#complexityGradient)" />

                    {/* Complexity zones */}
                    <rect x="0" y="0" width="1000" height="600" fill="none" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5,5" />
                    <line x1="0" y1="200" x2="1000" y2="200" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5,5" />
                    <line x1="0" y1="400" x2="1000" y2="400" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5,5" />
                    <line x1="333" y1="0" x2="333" y2="600" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5,5" />
                    <line x1="666" y1="0" x2="666" y2="600" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5,5" />

                    {/* Zone labels with statistics */}
                    <g className="text-xs fill-gray-500">
                      <text x="10" y="20">High Complexity ({complexityData.filter(f => f.complexity >= 70).length} files)</text>
                      <text x="10" y="220">Medium Complexity ({complexityData.filter(f => f.complexity >= 50 && f.complexity < 70).length} files)</text>
                      <text x="10" y="420">Low Complexity ({complexityData.filter(f => f.complexity < 50).length} files)</text>
                      <text x="10" y="590">Small Files ({complexityData.filter(f => f.size < 1000).length} files)</text>
                      <text x="990" y="590" className="text-right">Large Files ({complexityData.filter(f => f.size >= 1000).length} files)</text>
                    </g>

                    {/* Data points */}
                    {complexityData.map((file, index) => (
                      <g key={index} className="group">
                        {/* Background circle for better hover detection */}
                        <circle
                          cx={file.size * 0.1}
                          cy={600 - file.complexity * 6}
                          r={Math.sqrt(file.complexity) * 0.8 + 10}
                          fill="transparent"
                          className="cursor-pointer"
                        />
                        
                        {/* Main data point */}
                        <circle
                          cx={file.size * 0.1}
                          cy={600 - file.complexity * 6}
                          r={Math.sqrt(file.complexity) * 0.8}
                          fill={file.complexity >= 70 ? '#ef4444' :
                                file.complexity >= 50 ? '#f59e0b' :
                                '#10b981'}
                          fillOpacity={0.7}
                          stroke={file.complexity >= 70 ? '#dc2626' :
                                 file.complexity >= 50 ? '#d97706' :
                                 '#059669'}
                          strokeWidth={2}
                          className="transition-colors duration-200"
                        />

                        {/* Warning indicator for high complexity */}
                        {file.complexity >= 70 && (
                          <circle
                            cx={file.size * 0.1}
                            cy={600 - file.complexity * 6}
                            r={Math.sqrt(file.complexity) * 0.8 + 4}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth={1}
                            strokeDasharray="2,2"
                            className="animate-pulse"
                          />
                        )}

                        {/* File name label - always visible but subtle */}
                        <text
                          x={file.size * 0.1}
                          y={600 - file.complexity * 6 - Math.sqrt(file.complexity) * 0.8 - 5}
                          className="text-[10px] fill-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          textAnchor="middle"
                        >
                          {file.name.split('/').pop()}
                        </text>

                        {/* Detailed tooltip */}
                        <foreignObject
                          x={file.size * 0.1 + 15}
                          y={600 - file.complexity * 6 - 60}
                          width="200"
                          height="120"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <div className="bg-white rounded-lg shadow-lg p-3 text-xs">
                            <div className="font-medium text-gray-900 mb-1">{file.name}</div>
                            <div className="space-y-1 text-gray-600">
                              <div className="flex justify-between">
                                <span>Complexity:</span>
                                <span className="font-medium">{file.complexity}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Size:</span>
                                <span className="font-medium">{(file.size / 1024).toFixed(1)} KB</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Last Modified:</span>
                                <span className="font-medium">{file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Dependencies:</span>
                                <span className="font-medium">{file.dependencies?.length || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Contributors:</span>
                                <span className="font-medium">{file.contributors?.length || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Commits:</span>
                                <span className="font-medium">{file.commitCount || 0}</span>
                              </div>
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    ))}

                    {/* Statistics Panel */}
                    <g transform="translate(750, 20)">
                      <rect x="0" y="0" width="200" height="120" fill="white" fillOpacity="0.9" rx="4" />
                      <text x="10" y="20" className="text-sm font-medium fill-gray-900">Codebase Statistics</text>
                      <text x="10" y="40" className="text-xs fill-gray-700">
                        Total Files: {complexityData.length}
                      </text>
                      <text x="10" y="60" className="text-xs fill-gray-700">
                        Avg Complexity: {Math.round(complexityData.reduce((sum, f) => sum + f.complexity, 0) / complexityData.length)}%
                      </text>
                      <text x="10" y="80" className="text-xs fill-gray-700">
                        High Risk Files: {complexityData.filter(f => f.complexity >= 70).length}
                      </text>
                      <text x="10" y="100" className="text-xs fill-gray-700">
                        Total Size: {(complexityData.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB
                      </text>
                    </g>

                    {/* Legend with enhanced information */}
                    <g transform="translate(20, 20)">
                      <rect x="0" y="0" width="200" height="100" fill="white" fillOpacity="0.9" rx="4" />
                      <text x="10" y="20" className="text-sm font-medium fill-gray-900">Complexity Levels</text>
                      <circle cx="15" cy="35" r="6" fill="#10b981" fillOpacity="0.7" stroke="#059669" strokeWidth="2" />
                      <text x="30" y="40" className="text-xs fill-gray-700">Low ({'<'} 50%)</text>
                      <circle cx="15" cy="55" r="6" fill="#f59e0b" fillOpacity="0.7" stroke="#d97706" strokeWidth="2" />
                      <text x="30" y="60" className="text-xs fill-gray-700">Medium (50-70%)</text>
                      <circle cx="15" cy="75" r="6" fill="#ef4444" fillOpacity="0.7" stroke="#dc2626" strokeWidth="2" />
                      <text x="30" y="80" className="text-xs fill-gray-700">High ({'>'} 70%)</text>
                      <text x="10" y="95" className="text-xs fill-gray-500">Circle size indicates complexity level</text>
                    </g>
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
                      type: 'Caching',
                      size: 1500,
                      lastModified: '2024-03-13',
                      complexity: 5,
                      dependencies: ['redis', 'ioredis'],
                      contributors: ['John Doe'],
                      commitCount: 6
                    },
                    'UserSvc': {
                      path: 'src/services/user.ts',
                      type: 'Service',
                      size: 2200,
                      lastModified: '2024-03-15',
                      complexity: 9,
                      dependencies: ['mongoose', 'bcrypt'],
                      contributors: ['Jane Smith', 'Mike Johnson'],
                      commitCount: 14
                    },
                    'DataSvc': {
                      path: 'src/services/data.ts',
                      type: 'Service',
                      size: 1900,
                      lastModified: '2024-03-14',
                      complexity: 7,
                      dependencies: ['mongoose', 'redis'],
                      contributors: ['John Doe'],
                      commitCount: 9
                    },
                    'FileSvc': {
                      path: 'src/services/file.ts',
                      type: 'Service',
                      size: 2100,
                      lastModified: '2024-03-15',
                      complexity: 8,
                      dependencies: ['aws-sdk', 'multer'],
                      contributors: ['Jane Smith'],
                      commitCount: 11
                    },
                    'DB': {
                      path: 'src/db/index.ts',
                      type: 'Database',
                      size: 1800,
                      lastModified: '2024-03-13',
                      complexity: 6,
                      dependencies: ['mongoose', 'redis'],
                      contributors: ['John Doe', 'Mike Johnson'],
                      commitCount: 9
                    },
                    'S3': {
                      path: 'src/storage/s3.ts',
                      type: 'Object Storage',
                      size: 1200,
                      lastModified: '2024-03-14',
                      complexity: 4,
                      dependencies: ['aws-sdk'],
                      contributors: ['Jane Smith'],
                      commitCount: 7
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