import React, { useState } from 'react';
import { 
  BarChart3, 
  GitBranch, 
  Layers, 
  TrendingUp,
  Clock,
  Network,
  FileText,
  Activity,
  Zap
} from 'lucide-react';
import { AnalysisResult } from '../../types';

// Import diagram components
import ComponentDependencyWheel from '../diagrams/ComponentDependencyWheel';
import FileSystemIcicle from '../diagrams/FileSystemIcicle';
import APIRouteTree from '../diagrams/APIRouteTree';
import FeatureFileMatrix from '../diagrams/FeatureFileMatrix';
import CodeChurnSunburst from '../diagrams/CodeChurnSunburst';
import TemporalCouplingGraph from '../diagrams/TemporalCouplingGraph';
import ContributorStreamgraph from '../diagrams/ContributorStreamgraph';
import DataTransformationSankey from '../diagrams/DataTransformationSankey';
import PRLifecycleGantt from '../diagrams/PRLifecycleGantt';

interface DiagramsPageProps {
  reportData: AnalysisResult;
}

const DiagramsPage = ({ reportData }: DiagramsPageProps) => {
  const [selectedDiagram, setSelectedDiagram] = useState('dependency-wheel');

  const diagrams = [
    {
      id: 'dependency-wheel',
      title: 'Component Dependency Wheel',
      description: 'Chord diagram showing module dependencies',
      icon: <Network className="w-5 h-5" />,
      category: 'Architecture'
    },
    {
      id: 'filesystem-icicle',
      title: 'File System Icicle Chart',
      description: 'Hierarchical view of directory structure',
      icon: <Layers className="w-5 h-5" />,
      category: 'Architecture'
    },
    {
      id: 'api-routes',
      title: 'API Route Tree',
      description: 'Tree diagram of API endpoints',
      icon: <GitBranch className="w-5 h-5" />,
      category: 'Architecture'
    },
    {
      id: 'feature-matrix',
      title: 'Feature-File Matrix',
      description: 'Heatmap of feature to file relationships',
      icon: <BarChart3 className="w-5 h-5" />,
      category: 'Architecture'
    },
    {
      id: 'churn-sunburst',
      title: 'Code Churn Sunburst',
      description: 'Radial view of code change frequency',
      icon: <Activity className="w-5 h-5" />,
      category: 'Temporal'
    },
    {
      id: 'temporal-coupling',
      title: 'Temporal Coupling Graph',
      description: 'Files frequently changed together',
      icon: <Network className="w-5 h-5" />,
      category: 'Temporal'
    },
    {
      id: 'contributor-stream',
      title: 'Contributor Streamgraph',
      description: 'Team activity evolution over time',
      icon: <TrendingUp className="w-5 h-5" />,
      category: 'Temporal'
    },
    {
      id: 'data-pipeline',
      title: 'Data Transformation Pipeline',
      description: 'Sankey diagram of data flow',
      icon: <Zap className="w-5 h-5" />,
      category: 'Data Flow'
    },
    {
      id: 'pr-lifecycle',
      title: 'PR Lifecycle Gantt',
      description: 'Pull request process timeline',
      icon: <Clock className="w-5 h-5" />,
      category: 'Process'
    }
  ];

  // Generate mock data for demonstrations
  const generateMockData = () => {
    const { files, contributors, commits, repository } = reportData;

    // Component dependencies (simplified)
    const dependencies = [
      { source: 'components', target: 'utils', value: 15 },
      { source: 'pages', target: 'components', value: 25 },
      { source: 'services', target: 'types', value: 12 },
      { source: 'components', target: 'hooks', value: 8 },
      { source: 'pages', target: 'services', value: 18 }
    ];

    // File system hierarchy
    const fileSystemData = {
      name: repository.name,
      path: '/',
      type: 'directory' as const,
      size: 0,
      children: [
        {
          name: 'src',
          path: '/src',
          type: 'directory' as const,
          size: 0,
          children: files.slice(0, 10).map(f => ({
            name: f.name,
            path: f.path,
            type: 'file' as const,
            size: f.size
          }))
        }
      ]
    };

    // API routes
    const apiRoutes = {
      name: 'API',
      path: '/api',
      children: [
        {
          name: 'users',
          path: '/api/users',
          children: [
            { name: 'GET', path: '/api/users', method: 'GET', file: 'users.js' },
            { name: 'POST', path: '/api/users', method: 'POST', file: 'users.js' }
          ]
        },
        {
          name: 'auth',
          path: '/api/auth',
          children: [
            { name: 'POST login', path: '/api/auth/login', method: 'POST', file: 'auth.js' },
            { name: 'POST logout', path: '/api/auth/logout', method: 'POST', file: 'auth.js' }
          ]
        }
      ]
    };

    // Feature-file matrix
    const features = ['Authentication', 'User Management', 'Data Processing', 'UI Components'];
    const matrixFiles = files.slice(0, 8).map(f => f.name);
    const matrix = features.map(() => 
      matrixFiles.map(() => Math.random())
    );

    // Code churn data
    const churnData = {
      name: 'root',
      path: '/',
      type: 'directory' as const,
      churnRate: 0,
      children: [
        {
          name: 'src',
          path: '/src',
          type: 'directory' as const,
          churnRate: 0,
          children: files.slice(0, 8).map(f => ({
            name: f.name,
            path: f.path,
            type: 'file' as const,
            churnRate: Math.random() * 10
          }))
        }
      ]
    };

    // Temporal coupling
    const couplingNodes = files.slice(0, 12).map((f, i) => ({
      id: f.path,
      name: f.name,
      path: f.path,
      group: Math.floor(i / 3)
    }));

    const couplingLinks = [
      { source: couplingNodes[0].id, target: couplingNodes[1].id, strength: 0.8, commits: 15 },
      { source: couplingNodes[1].id, target: couplingNodes[2].id, strength: 0.6, commits: 12 },
      { source: couplingNodes[3].id, target: couplingNodes[4].id, strength: 0.9, commits: 20 }
    ];

    // Contributor stream data
    const streamData = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      
      const contributorData: { [key: string]: number } = {};
      contributors.slice(0, 6).forEach(c => {
        contributorData[c.login] = Math.floor(Math.random() * 20) + 1;
      });

      return {
        date: date.toISOString(),
        contributors: contributorData
      };
    });

    // Data pipeline
    const pipelineNodes = [
      { id: 'raw-data', name: 'Raw Data', category: 'Input' },
      { id: 'validation', name: 'Validation', category: 'Processing' },
      { id: 'transformation', name: 'Transform', category: 'Processing' },
      { id: 'storage', name: 'Storage', category: 'Output' }
    ];

    const pipelineLinks = [
      { source: 'raw-data', target: 'validation', value: 100 },
      { source: 'validation', target: 'transformation', value: 95 },
      { source: 'transformation', target: 'storage', value: 90 }
    ];

    // PR lifecycle phases
    const prPhases = [
      { name: 'Open', duration: 2, color: '#3B82F6', icon: <FileText className="w-4 h-4" /> },
      { name: 'Review', duration: 24, color: '#F59E0B', icon: <Clock className="w-4 h-4" /> },
      { name: 'Changes', duration: 8, color: '#EF4444', icon: <Activity className="w-4 h-4" /> },
      { name: 'Approval', duration: 4, color: '#10B981', icon: <Clock className="w-4 h-4" /> },
      { name: 'Merge', duration: 1, color: '#8B5CF6', icon: <GitBranch className="w-4 h-4" /> }
    ];

    return {
      dependencies,
      fileSystemData,
      apiRoutes,
      features,
      matrixFiles,
      matrix,
      churnData,
      couplingNodes,
      couplingLinks,
      streamData,
      pipelineNodes,
      pipelineLinks,
      prPhases
    };
  };

  const mockData = generateMockData();

  const renderDiagram = () => {
    switch (selectedDiagram) {
      case 'dependency-wheel':
        return <ComponentDependencyWheel dependencies={mockData.dependencies} />;
      
      case 'filesystem-icicle':
        return <FileSystemIcicle data={mockData.fileSystemData} />;
      
      case 'api-routes':
        return <APIRouteTree routes={mockData.apiRoutes} />;
      
      case 'feature-matrix':
        return (
          <FeatureFileMatrix 
            features={mockData.features}
            files={mockData.matrixFiles}
            matrix={mockData.matrix}
          />
        );
      
      case 'churn-sunburst':
        return <CodeChurnSunburst data={mockData.churnData} />;
      
      case 'temporal-coupling':
        return (
          <TemporalCouplingGraph 
            nodes={mockData.couplingNodes}
            links={mockData.couplingLinks}
          />
        );
      
      case 'contributor-stream':
        return <ContributorStreamgraph data={mockData.streamData} />;
      
      case 'data-pipeline':
        return (
          <DataTransformationSankey 
            nodes={mockData.pipelineNodes}
            links={mockData.pipelineLinks}
          />
        );
      
      case 'pr-lifecycle':
        return (
          <PRLifecycleGantt 
            phases={mockData.prPhases}
            totalDuration={39}
          />
        );
      
      default:
        return <div>Select a diagram to view</div>;
    }
  };

  const categories = ['All', 'Architecture', 'Temporal', 'Data Flow', 'Process'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredDiagrams = diagrams.filter(diagram => 
    selectedCategory === 'All' || diagram.category === selectedCategory
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-6 h-6 text-purple-500 mr-3" />
          Advanced Visualizations & Diagrams
        </h3>
        <p className="text-gray-600">
          Explore your repository through interactive diagrams and advanced visualizations 
          that reveal architectural patterns, temporal relationships, and data flows.
        </p>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                selectedCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Diagram Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 sticky top-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Diagrams</h4>
            <div className="space-y-2">
              {filteredDiagrams.map(diagram => (
                <button
                  key={diagram.id}
                  onClick={() => setSelectedDiagram(diagram.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                    selectedDiagram === diagram.id
                      ? 'bg-purple-100 border-purple-300 border'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      selectedDiagram === diagram.id ? 'bg-purple-200 text-purple-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {diagram.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{diagram.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{diagram.description}</div>
                      <div className="text-xs text-purple-600 mt-1">{diagram.category}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diagram Display */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="mb-6">
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                {diagrams.find(d => d.id === selectedDiagram)?.title}
              </h4>
              <p className="text-gray-600">
                {diagrams.find(d => d.id === selectedDiagram)?.description}
              </p>
            </div>

            <div className="flex justify-center">
              {renderDiagram()}
            </div>
          </div>
        </div>
      </div>

      {/* Insights Panel */}
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Diagram Insights</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Architectural Patterns</h5>
            <p className="text-blue-700 text-sm">
              Dependency wheel and file system diagrams reveal modular architecture 
              with clear separation of concerns.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <h5 className="font-medium text-green-900 mb-2">Temporal Insights</h5>
            <p className="text-green-700 text-sm">
              Code churn and temporal coupling show active development areas 
              and files that change together frequently.
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <h5 className="font-medium text-purple-900 mb-2">Process Optimization</h5>
            <p className="text-purple-700 text-sm">
              PR lifecycle and contributor streams highlight development workflow 
              efficiency and team collaboration patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagramsPage;