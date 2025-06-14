import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  GitBranch, 
  Layers, 
  Clock,
  Network,
  FileText,
  Activity,
  Shuffle, 
  Users, 
  Route, 
  GitCommit, 
  GitMerge, 
  ListChecks
} from 'lucide-react';
import { AnalysisResult } from '../../types';
import { 
  PRPhase, 
  ChurnNode as GlobalChurnNode, 
  FileNode,
  RouteNode
} from '../../types/advanced';

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
import { CheckCircle } from 'lucide-react'; 

interface DiagramsPageProps {
  reportData: AnalysisResult;
}

// All icons are now directly in the diagrams array, so this helper is not needed.

const DiagramsPage = ({ reportData }: DiagramsPageProps) => {
  const [selectedDiagram, setSelectedDiagram] = useState('dependency-wheel');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Use actual data from reportData with proper fallbacks
  const {
    files = [],
    dependencies
  } = reportData || {};

  const {
    dependencyWheelData = [],
    fileSystemTree,
    apiEndpoints = [],
    featureFileMatrixData,
    churnSunburstData,
    temporalCouplingData,
    contributorStreamData = [],
    dataTransformationSankey,
    prLifecycleData,
  } = reportData?.advancedAnalysis || {};

  // Generate fallback data if not provided by backend
  const apiRoutesTreeData = useMemo(() => {
    if (apiEndpoints.length === 0) {
      // Generate from file analysis
      const apiFiles = files.filter(f => 
        f.path.includes('api') || 
        f.path.includes('route') || 
        f.path.includes('controller')
      );
      
      if (apiFiles.length === 0) {
        return { name: 'API', path: '/api', children: [] };
      }
      
      // Create basic structure from file paths
      const root: RouteNode = { name: 'API', path: '/api', children: [] };
      apiFiles.forEach(file => {
        const pathParts = file.path.split('/');
        let current = root;
        
        pathParts.forEach((part, index) => {
          if (!current.children) current.children = [];
          
          let child = current.children.find(c => c.name === part);
          if (!child) {
            child = {
              name: part,
              path: `/${pathParts.slice(0, index + 1).join('/')}`,
              children: []
            };
            current.children.push(child);
          }
          current = child;
        });
      });
      
      return root;
    }

    // Original logic for when apiEndpoints exist
    const root: RouteNode = { name: 'API', path: '/api', children: [] };
    apiEndpoints.forEach(endpoint => {
      const pathParts = endpoint.path.replace(/^\//, '').split('/').filter(p => p);
      let currentNode = root;
      pathParts.forEach((part, index) => {
          let childNode = (currentNode.children || []).find(child => child.name === part && child.path === `/${pathParts.slice(0, index + 1).join('/')}`);
          if (!childNode) {
              childNode = { 
                  name: part, 
                  path: `/${pathParts.slice(0, index + 1).join('/')}`, 
                  children: [] 
              };
              if (!currentNode.children) {
                  currentNode.children = [];
              }
              currentNode.children.push(childNode);
          }

          if (index === pathParts.length - 1) {
              const methodNode = { 
                  name: endpoint.method, 
                  path: endpoint.path,
                  method: endpoint.method, 
                  file: endpoint.file,
                  children: [] 
              };
              if (!childNode.children) { 
                  childNode.children = [];
              }
              childNode.children.push(methodNode);
          }
          currentNode = childNode;
      });
    });
    return root;
  }, [apiEndpoints, files]);

  // Add fallback data generation for missing diagram data
  const fallbackDependencyWheelData = useMemo(() => {
    if (dependencyWheelData && dependencyWheelData.length > 0) return dependencyWheelData;
    
    if (dependencies && dependencies.links) {
      return dependencies.links.slice(0, 50).map(link => ({
        source: link.source,
        target: link.target,
        value: 1 
      }));
    }
    
    return [];
  }, [dependencyWheelData, dependencies]);

  const fallbackFileSystemTree = useMemo(() => {
    if (fileSystemTree) return fileSystemTree;
    
    // Generate from files
    const root: FileNode = { name: 'root', path: '/', type: 'directory', size: 0, children: [] };
    
    files.slice(0, 100).forEach(file => {
      const parts = file.path.split('/');
      let current = root;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        
        if (!current.children) current.children = [];
        
        let child = current.children.find(c => c.name === part);
        if (!child) {
          child = {
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            size: isLast ? file.size : 0,
            type: isLast ? 'file' : 'directory',
            children: isLast ? undefined : []
          };
          current.children.push(child);
        }
        
        current = child;
      }
    });
    
    return root;
  }, [fileSystemTree, files]);

  const diagrams = [
    { id: 'dependency-wheel', title: 'Module Dependency Wheel', description: 'Visualizes inter-dependencies between high-level modules or directories.', icon: <Network /> , category: 'Architecture'},
    { id: 'filesystem-icicle', title: 'File System Icicle', description: 'Hierarchical view of files and folders, sized by lines of code or complexity.', icon: <Layers /> , category: 'Architecture'},
    { id: 'api-routes', title: 'API Route Tree', description: 'Shows the structure of defined API endpoints.', icon: <Route /> , category: 'Architecture'},
    { id: 'feature-matrix', title: 'Feature-File Matrix', description: 'Maps features to the files that implement them.', icon: <ListChecks /> , category: 'Architecture'},
    { id: 'churn-sunburst', title: 'Code Churn Sunburst', description: 'Visualizes file churn rates in a hierarchical manner.', icon: <GitCommit /> , category: 'Temporal'},
    { id: 'temporal-coupling', title: 'Temporal Coupling Graph', description: 'Shows files that are frequently changed together in commits.', icon: <GitMerge /> , category: 'Temporal'},
    { id: 'contributor-stream', title: 'Contributor Streamgraph', description: 'Illustrates contributor activity over time.', icon: <Users /> , category: 'Temporal'},
    { id: 'data-pipeline', title: 'Data Transformation Sankey', description: 'Visualizes data flow and transformations within the application.', icon: <Shuffle /> , category: 'Data Flow'},
    { id: 'pr-lifecycle', title: 'PR Lifecycle Gantt', description: 'Shows typical phases and durations of pull requests.', icon: <GitBranch /> , category: 'Process'}
  ];
  
  if (!reportData) {
    return <div className="p-6 bg-white rounded-lg shadow">Loading diagram data...</div>;
  }
  
  const EmptyState: React.FC<{message: string}> = ({message}) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
        <Layers className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-lg">{message}</p>
        <p className="text-sm">Please ensure the analysis has sufficient data for this visualization.</p>
    </div>
  );

  // Update renderDiagramComponent to use fallback data
  const renderDiagramComponent = () => {
    switch (selectedDiagram) {
      case 'dependency-wheel':
        return fallbackDependencyWheelData.length > 0 ? 
          <ComponentDependencyWheel dependencies={fallbackDependencyWheelData} width={700} height={700} /> : 
          <EmptyState message="No dependency data available." />;
          
      case 'filesystem-icicle':
        return (fallbackFileSystemTree.children && fallbackFileSystemTree.children.length > 0) ?
          <FileSystemIcicle data={fallbackFileSystemTree} width={700} height={500} /> : 
          <EmptyState message="No file system data to display." />;
      
      case 'api-routes': {
        return (apiRoutesTreeData.children && apiRoutesTreeData.children.length > 0) ?
            <APIRouteTree routes={apiRoutesTreeData} width={700} height={500} /> :
            <EmptyState message="No API endpoint data available." />;
      }
      case 'feature-matrix': {
        const fmData = featureFileMatrixData || { features: [], files: [], matrix: [] };
        return (fmData.features.length > 0) ? (
          <FeatureFileMatrix 
            features={fmData.features}
            files={fmData.files}
            matrix={fmData.matrix}
            width={700} height={500}
          />
        ) : <EmptyState message="No feature matrix data available." />;
      }
      case 'churn-sunburst': {
        const csData = churnSunburstData || {name: 'root', path:'/', type: 'directory', churnRate: 0, children: []};
        return (csData.children && csData.children.length > 0 && csData.churnRate > 0) ?
            <CodeChurnSunburst data={csData as GlobalChurnNode} width={600} height={600} /> : 
            <EmptyState message="No code churn data to display." />;
      }
      case 'temporal-coupling': {
        const tcData = temporalCouplingData || { nodes: [], links: [] };
        return (tcData.nodes.length > 0) ? (
          <TemporalCouplingGraph 
            nodes={tcData.nodes.map(n => ({ ...n, group: n.group || 1 }))}
            links={tcData.links}
            width={700} height={500}
          />
        ) : <EmptyState message="Not enough data for Temporal Coupling Graph." />;
      }
      case 'contributor-stream': {
        return (contributorStreamData && contributorStreamData.length > 0) ?
            <ContributorStreamgraph data={contributorStreamData} width={700} height={400} /> :
            <EmptyState message="No contributor activity stream data available." />;
      }
      case 'data-pipeline': {
        const dpData = dataTransformationSankey || { nodes: [], links: [] };
        return (dpData.nodes.length > 0) ? (
          <DataTransformationSankey 
            nodes={dpData.nodes}
            links={dpData.links}
            width={700} height={400}
          />
        ) : <EmptyState message="No data pipeline data available." />;
      }
      case 'pr-lifecycle': {
        const defaultPhases: PRPhase[] = [
          { name: 'Open', duration: 2, color: '#3B82F6', icon: <FileText className="w-4 h-4" /> },
          { name: 'Review', duration: 24, color: '#F59E0B', icon: <Clock className="w-4 h-4" /> },
          { name: 'Changes', duration: 8, color: '#EF4444', icon: <Activity className="w-4 h-4" /> },
          { name: 'Approval', duration: 4, color: '#10B981', icon: <CheckCircle className="w-4 h-4" /> },
          { name: 'Merge', duration: 1, color: '#8B5CF6', icon: <GitBranch className="w-4 h-4" /> }
        ];
        
        const currentPrData = prLifecycleData || { phases: defaultPhases, totalDuration: defaultPhases.reduce((s, p) => s + p.duration, 0) };
        
        return (currentPrData.phases.length > 0) ? (
          <PRLifecycleGantt 
            phases={currentPrData.phases}
            totalDuration={currentPrData.totalDuration}
            width={700} height={350}
          />
        ) : <EmptyState message="No PR lifecycle data available." />;
      }
      default:
        return <EmptyState message="Select a diagram to view." />;
    }
  };
  
  const categories = ['All', ...new Set(diagrams.map(d => d.category))];

  const filteredDiagrams = diagrams.filter(diagram => 
    selectedCategory === 'All' || diagram.category === selectedCategory
  );

  return (
    <div className="space-y-8">
      <header className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center">
          <BarChart3 className="w-6 h-6 text-purple-500 mr-3" />
          Advanced Visualizations Gallery
        </h3>
        <p className="text-gray-600">
          Explore various aspects of your repository through these specialized diagrams. 
          Select a category or diagram type below.
        </p>
      </header>

      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-100">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400 ${
                selectedCategory === category
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-100 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Diagrams</h4>
            <nav className="space-y-1.5">
              {filteredDiagrams.map(diagram => (
                <button
                  key={diagram.id}
                  onClick={() => setSelectedDiagram(diagram.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 group hover:bg-indigo-50 ${
                    selectedDiagram === diagram.id
                      ? 'bg-indigo-100 border-indigo-400 border-l-4 font-semibold text-indigo-700'
                      : 'text-gray-600 hover:text-indigo-600 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-md ${
                      selectedDiagram === diagram.id ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                    }`}>
                      {React.cloneElement(diagram.icon as React.ReactElement, {className: "w-4 h-4"})}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">{diagram.title}</div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-600 mt-0.5 line-clamp-1">{diagram.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="lg:col-span-9">
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-gray-100 min-h-[600px]">
            <header className="mb-6 pb-4 border-b border-gray-200">
              <h4 className="text-xl font-semibold text-gray-900 mb-1">
                {diagrams.find(d => d.id === selectedDiagram)?.title || "Select a Diagram"}
              </h4>
              <p className="text-gray-500 text-sm">
                {diagrams.find(d => d.id === selectedDiagram)?.description}
              </p>
            </header>
            <div className="flex justify-center items-center">
              {renderDiagramComponent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DiagramsPage;
