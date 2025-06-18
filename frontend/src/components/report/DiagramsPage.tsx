import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ListChecks,
  Share2, // Added for Dependency Graph
  ExternalLink
} from 'lucide-react';
import { AnalysisResult } from '../../types';
import { 
  PRPhase, 
  ChurnNode as GlobalChurnNode, 
  FileNode,
  RouteNode
} from '../../types/advanced';

// Import diagram components
import VisualizationErrorBoundary from '../VisualizationErrorBoundary'; // Added
import ComponentDependencyWheel from '../diagrams/ComponentDependencyWheel';
import FileSystemIcicle from '../diagrams/FileSystemIcicle';
import APIRouteTree from '../diagrams/APIRouteTree';
import FeatureFileMatrix from '../diagrams/FeatureFileMatrix';
import CodeChurnSunburst from '../diagrams/CodeChurnSunburst';
import TemporalCouplingGraph from '../diagrams/TemporalCouplingGraph';
import ContributorStreamgraph from '../diagrams/ContributorStreamgraph'; 
import DataTransformationSankey from '../diagrams/DataTransformationSankey';
import PRLifecycleGantt from '../diagrams/PRLifecycleGantt';
import DependencyGraph, { DependencyNode as VisDependencyNode, DependencyLink as VisDependencyLink } from '../diagrams/DependencyGraph'; // Added
// import DependencyGraph3D from '../diagrams/DependencyGraph3D'; // Commented out due to missing module
import { CheckCircle } from 'lucide-react';

interface DiagramsPageProps {
  reportData: AnalysisResult;
}

// All icons are now directly in the diagrams array, so this helper is not needed.

const DiagramsPage = ({ reportData }: DiagramsPageProps) => {
  const navigate = useNavigate();
  const [selectedDiagram, setSelectedDiagram] = useState('dependency-wheel');
  const [selectedCategory, setSelectedCategory] = useState('All');
  // Use actual data from reportData with proper fallbacks
  const {
    files = [],
    // dependencyMetrics // Removed as reportData.dependencies is used as primary and fallback
  } = reportData || {};
  const {
    dependencyWheelData = [],
    fileSystemTree,
    apiEndpoints = [],
    churnSunburstData,
    temporalCouplingData,
    contributorStreamData = [],
    dataTransformationSankey,
    prLifecycleData,
    // dependencyGraphData // This might be a more suitable source if available
  } = reportData?.advancedAnalysis || {};
  // Generate fallback data if not provided by backend
  const apiRoutesTreeData = useMemo(() => {
    if (apiEndpoints.length === 0) {
      // Generate from file analysis with enhanced logic
      const apiFiles = files.filter(f => 
        f.path.includes('api') || 
        f.path.includes('route') || 
        f.path.includes('controller') ||
        f.path.includes('endpoint') ||
        f.path.includes('handler') ||
        f.name.match(/\.(ts|js|py|go|java|rb|php)$/i)
      );
        if (apiFiles.length === 0) {
        // Create a simple, well-spaced sample API structure
        return { 
          name: 'API', 
          path: '/api', 
          children: [
            {
              name: 'auth',
              path: '/api/auth',
              children: [
                { name: 'login', path: '/api/auth/login', method: 'POST', children: [] },
                { name: 'logout', path: '/api/auth/logout', method: 'POST', children: [] }
              ]
            },
            {
              name: 'users',
              path: '/api/users',
              children: [
                { name: 'list', path: '/api/users', method: 'GET', children: [] },
                { name: 'create', path: '/api/users', method: 'POST', children: [] }
              ]
            },
            {
              name: 'health',
              path: '/api/health',
              children: [
                { name: 'status', path: '/api/health', method: 'GET', children: [] }
              ]
            }
          ]
        };
      }
      
      // Create enhanced structure from file paths
      const root: RouteNode = { name: 'API', path: '/api', children: [] };
      const resourceMap = new Map<string, RouteNode>();
      
      // First pass: identify potential API resources
      apiFiles.forEach(file => {
        const pathParts = file.path.toLowerCase().split('/');
        const fileName = file.name.toLowerCase();
          // Look for common resource patterns
        const resources = ['user', 'auth', 'product', 'order'];
        resources.forEach(resource => {
          if (pathParts.some(part => part.includes(resource)) || fileName.includes(resource)) {
            if (!resourceMap.has(resource)) {
              const resourceNode: RouteNode = {
                name: resource,
                path: `/api/${resource}`,
                children: [
                  { name: `list`, path: `/api/${resource}`, method: 'GET', children: [], file: file.path },
                  { name: `create`, path: `/api/${resource}`, method: 'POST', children: [], file: file.path },
                  { name: `by id`, path: `/api/${resource}/:id`, method: 'GET', children: [], file: file.path }
                ]
              };
              resourceMap.set(resource, resourceNode);
              if (!root.children) root.children = [];
              root.children.push(resourceNode);
            }
          }
        });
      });
      
      // If no resources found, create basic file-based structure
      if (resourceMap.size === 0) {
        apiFiles.forEach(file => {
          const pathParts = file.path.split('/').filter(p => p);
          let current = root;
          
          pathParts.forEach((part, index) => {
            if (!current.children) current.children = [];
            
            let child = current.children.find(c => c.name === part);
            if (!child) {
              child = {
                name: part,
                path: `/${pathParts.slice(0, index + 1).join('/')}`,
                children: [],
                file: index === pathParts.length - 1 ? file.path : undefined
              };
              current.children.push(child);
            }
            current = child;
          });
        });
      }
      
      return root;
    }

    // Original logic for when apiEndpoints exist
    const root: RouteNode = { name: 'API', path: '/api', children: [] };
    apiEndpoints.forEach((endpoint: import('../../types').APIEndpoint) => {
      const pathParts = endpoint.path.replace(/^\//, '').split('/').filter((p: string) => p);
      let currentNode = root;
      pathParts.forEach((part: string, index: number) => {
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
    if (dependencyWheelData && dependencyWheelData.length > 0) return dependencyWheelData;    // For dependency wheel, use package dependencies from dependencyMetrics
    if (reportData.dependencyMetrics?.packageDependencyGraph?.links) {
      const links = reportData.dependencyMetrics.packageDependencyGraph.links as Array<{ source: string; target: string; value?: number }>;
      return links.slice(0, 50).map(link => ({
        source: link.source,
        target: link.target,
        value: link.value || 1 
      }));
    }
    
    // Fallback: try to use internal dependency graph if no package dependencies
    if (reportData.dependencyGraph?.links) {
      return reportData.dependencyGraph.links.slice(0, 20).map(link => ({
        source: link.source,
        target: link.target,
        value: 1 
      }));
    }
    
    return [];
  }, [dependencyWheelData, reportData.dependencyMetrics, reportData.dependencyGraph]);  const preparedDependencyGraphData = useMemo(() => {
    // Use dependencyGraph for internal module dependencies, not dependencies which contains package.json deps
    const depData = reportData.dependencyGraph; 

    if (!depData || !depData.nodes || !depData.links) {
      console.log('No dependency graph data available, generating fallback from files:', { depData });
      
      // Generate fallback nodes from files
      const fallbackNodes: VisDependencyNode[] = files.slice(0, 20).map((file, index) => ({
        id: file.path || `file-${index}`,
        name: file.path?.split('/').pop() || 'Unknown File',
        type: file.path?.includes('frontend') ? 'frontend' : 
              file.path?.includes('backend') ? 'backend' : 
              file.path?.includes('api') ? 'service' : 'module',
        size: file.size || 100,
        metrics: { 
          complexity: Math.floor(Math.random() * 100), 
          dependencies: Math.floor(Math.random() * 10), 
          dependents: Math.floor(Math.random() * 5), 
          lastModified: 'N/A' 
        },
      }));

      return { nodes: fallbackNodes, links: [] };
    }

    console.log('Processing dependency graph data:', { 
      nodes: depData.nodes.length, 
      links: depData.links.length 
    });

    // Use the ArchitectureData nodes/links structure
    const visNodes: VisDependencyNode[] = depData.nodes.map((n) => ({
      id: n.id || n.path || `node-${Math.random().toString(36).substr(2, 9)}`,
      name: n.name || n.path?.split('/').pop() || 'Unknown Node',
      type: n.type || 'module',
      size: 100, // Default size since ArchitectureData nodes don't have size
      metrics: { 
        complexity: 0, 
        dependencies: 0, 
        dependents: 0, 
        lastModified: 'N/A' 
      },
    }));

    const visLinks: VisDependencyLink[] = depData.links.map((l) => {
      // ArchitectureData links have source/target as strings (node IDs)
      const sourceNode = visNodes.find(vn => vn.id === l.source);
      const targetNode = visNodes.find(vn => vn.id === l.target);
      
      if (!sourceNode || !targetNode) {
        console.warn('Skipping link due to missing source/target node in DependencyGraph:', l, { 
          availableNodeIds: visNodes.map(vn => vn.id) 
        });
        return null; 
      }

      return {
        source: sourceNode, 
        target: targetNode,
        type: 'imports',
        strength: 1,
      };
    }).filter(l => l !== null) as VisDependencyLink[];

    console.log('Prepared dependency graph data:', { 
      nodes: visNodes.length, 
      links: visLinks.length 
    });

    return { nodes: visNodes, links: visLinks };
  }, [reportData.dependencyGraph, files]);

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
    { id: 'pr-lifecycle', title: 'PR Lifecycle Gantt', description: 'Shows typical phases and durations of pull requests.', icon: <GitBranch /> , category: 'Process'},
    { id: 'dependency-graph', title: 'Project Dependency Graph', description: 'Visualizes the overall project dependencies and their relationships.', icon: <Share2 /> , category: 'Architecture'},
    // { id: 'dependency-graph-3d', title: '3D Dependency Graph', description: 'Interactive 3D visualization of project dependencies with force-directed layout.', icon: <Network /> , category: 'Architecture'}
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
    if (selectedDiagram === 'dependency-graph') {
      console.log('Prepared Dependency Graph Data:', preparedDependencyGraphData);
    }
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
        const hasData = apiRoutesTreeData.children && apiRoutesTreeData.children.length > 0;
        return hasData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">API Route Tree</h3>
              <button
                onClick={() => navigate(`/api-tree/${reportData.id}`, { state: { reportData } })}
                className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Full Page</span>
              </button>
            </div>
            <APIRouteTree routes={apiRoutesTreeData} width={900} height={700} />
          </div>
        ) : (
          <EmptyState message="No API endpoint data available." />
        );
      }      case 'feature-matrix': {
        // Use the actual featureFileMatrix data from the top-level reportData
        const fmData = reportData.featureFileMatrix || [];
        return fmData.length > 0 ? (
          <div className="w-full h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Feature-File Matrix</h3>
              <button 
                onClick={() => navigate(`/feature-matrix/${reportData.id}`, { state: { reportData } })}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Full Page</span>
              </button>
            </div>
            <FeatureFileMatrix 
              data={fmData}
              width={900} 
              height={600}
            />
          </div>
        ) : (
          <EmptyState message="No feature matrix data available." />
        );
      }
      case 'churn-sunburst': {
        const csData = churnSunburstData || {name: 'root', path:'/', type: 'directory', churnRate: 0, children: []};
        return (csData.children && csData.children.length > 0 && csData.churnRate > 0) ?
            <CodeChurnSunburst data={csData as GlobalChurnNode} width={600} height={600} /> : 
            <EmptyState message="No code churn data to display." />;
      }      case 'temporal-coupling': {
        const tcData = temporalCouplingData || { nodes: [], links: [] };
        // Convert to TemporalCoupling array format expected by the component
        const temporalData = tcData.links?.map(link => ({
          source: link.source as string,
          target: link.target as string,
          weight: link.strength || 1
        })) || [];
        
        return temporalData.length > 0 ? (
          <TemporalCouplingGraph 
            data={temporalData}
          />
        ) : <EmptyState message="Not enough data for Temporal Coupling Graph." />;
      }
      case 'contributor-stream': {
        return (contributorStreamData && contributorStreamData.length > 0) ?
            <ContributorStreamgraph data={contributorStreamData} width={700} height={400} /> :
            <EmptyState message="No contributor activity stream data available." />;
      }
      case 'data-pipeline': {
        const dpData = dataTransformationSankey || { nodes: [], links: [] };        return (dpData.nodes.length > 0) ? (
          <DataTransformationSankey 
            data={dpData}
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
      }      case 'dependency-graph':
        return (
          <VisualizationErrorBoundary>
            {(preparedDependencyGraphData.nodes.length > 0) ?
              <DependencyGraph nodes={preparedDependencyGraphData.nodes} links={preparedDependencyGraphData.links} /> :
              <EmptyState message="No data available for Project Dependency Graph (either no nodes/links or data processing issue)." />}
          </VisualizationErrorBoundary>
        );
      // Commented out due to missing module
      // case 'dependency-graph-3d':
      //   return (
      //     <VisualizationErrorBoundary>
      //       {(preparedDependencyGraphData.nodes.length > 0) ?
      //         <DependencyGraph nodes={preparedDependencyGraphData.nodes} links={preparedDependencyGraphData.links} /> :
      //         <EmptyState message="No data available for Dependency Graph." />}
      //     </VisualizationErrorBoundary>
      //   );
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
