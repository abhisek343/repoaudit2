import { 
  GitCommit, Users, Code, Shield, CheckSquare, Star, Activity, AlertTriangle, 
  FileText, Package, TrendingUp, Database
} from 'lucide-react';
import { AnalysisResult } from '../types';

interface MetricsGridProps {
  metrics: AnalysisResult['metrics'];
  analysisResult?: AnalysisResult; // Add full result for comprehensive metrics
}

const MetricsGrid = ({ metrics, analysisResult }: MetricsGridProps) => {
  // Calculate comprehensive file metrics from the archive analysis
  const totalFiles = analysisResult?.files?.length || 0;
  const sourceFiles = analysisResult?.files?.filter(f => 
    f.language && f.language !== 'text' && f.content
  ).length || 0;
  
  const avgComplexity = metrics.avgComplexity || 0;
  
  // Enhanced language count from actual analysis
  const languageCount = metrics.languageDistribution ? 
    Object.keys(metrics.languageDistribution).length : 
    Object.keys(analysisResult?.languages || {}).length;
  
  // More accurate repository size calculation
  const repositorySize = metrics.repositorySize || 
    (analysisResult?.basicInfo?.size ? analysisResult.basicInfo.size * 1024 : 0); // GitHub API returns KB
  
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return 'N/A';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  };

  const metricCards = [
    {
      icon: <Code className="w-6 h-6 text-purple-500" />,
      label: 'Lines of Code',
      value: metrics.linesOfCode > 0 ? 
        `${(metrics.linesOfCode / 1000).toFixed(1)}K` : '0',
      subtitle: `Across ${sourceFiles.toLocaleString()} source files`,
    },
    {
      icon: <FileText className="w-6 h-6 text-blue-500" />,
      label: 'Total Files',
      value: totalFiles.toLocaleString(),
      subtitle: `${sourceFiles.toLocaleString()} analyzable source files`,
    },
    {
      icon: <GitCommit className="w-6 h-6 text-green-500" />,
      label: 'Total Commits',
      value: metrics.totalCommits?.toLocaleString() || '0',
      subtitle: 'Repository history',
    },
    {
      icon: <Users className="w-6 h-6 text-orange-500" />,
      label: 'Contributors',
      value: metrics.totalContributors?.toLocaleString() || '0',
      subtitle: 'Active developers',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-indigo-500" />,
      label: 'Avg Complexity',
      value: avgComplexity > 0 ? avgComplexity.toFixed(1) : '0.0',
      subtitle: 'Per file complexity score',
    },
    {
      icon: <Package className="w-6 h-6 text-cyan-500" />,
      label: 'Languages',
      value: languageCount.toString(),
      subtitle: 'Programming languages used',
    },
    {
      icon: <CheckSquare className="w-6 h-6 text-teal-500" />,
      label: 'Test Coverage',
      value: `${(metrics.testCoverage || 0).toFixed(1)}%`,
      subtitle: 'Code coverage percentage',
    },
    {
      icon: <Star className="w-6 h-6 text-yellow-500" />,
      label: 'Quality Score',
      value: `${(metrics.codeQuality || 0).toFixed(1)}/10`,
      subtitle: 'Overall code quality',
    },
    {
      icon: <Shield className="w-6 h-6 text-red-500" />,
      label: 'Security Score',
      value: `${(metrics.securityScore || 0).toFixed(1)}/10`,
      subtitle: `${(metrics.criticalVulnerabilities || 0) + (metrics.highVulnerabilities || 0)} critical/high issues`,
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
      label: 'Bus Factor',
      value: (metrics.busFactor || 0).toString(),
      subtitle: 'Knowledge concentration risk',
    },
    {
      icon: <Activity className="w-6 h-6 text-pink-500" />,
      label: 'Technical Debt',
      value: (metrics.technicalDebtScore || 0).toString(),
      subtitle: 'Maintenance burden score',
    },
    {
      icon: <Database className="w-6 h-6 text-emerald-500" />,
      label: 'Repository Size',
      value: formatSize(repositorySize),
      subtitle: 'Total repository size',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
      {metricCards.map((metric, index) => (
        <div 
          key={index}
          className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between min-h-[140px]"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-gray-100 rounded-lg">
              {metric.icon}
            </div>
          </div>
          
          <div>
            <h4 className="text-2xl font-bold text-gray-800 mb-1">
              {metric.value}
            </h4>
            <p className="text-gray-600 text-sm font-medium mb-1">
              {metric.label}
            </p>
            {metric.subtitle && (
              <p className="text-gray-400 text-xs">
                {metric.subtitle}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsGrid;
