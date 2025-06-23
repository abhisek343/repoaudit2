import React from 'react';
import { 
  Code, FileText, GitCommit, Users, TrendingUp, Package, CheckSquare, 
  Star, Shield, AlertTriangle, Activity, Database
} from 'lucide-react';
import { AnalysisResult } from '../types';

interface ComprehensiveMetricsPanelProps {
  analysisResult: AnalysisResult;
}

export const ComprehensiveMetricsPanel: React.FC<ComprehensiveMetricsPanelProps> = ({ 
  analysisResult 
}) => {
  const { metrics, files = [], basicInfo } = analysisResult;
  
  // Calculate enhanced display values
  const sourceFiles = files.filter(f => f.content && f.language && f.language !== 'text').length;
  const repositorySize = metrics.repositorySize || (basicInfo.size ? basicInfo.size * 1024 : 0);
  const languageCount = metrics.languageDistribution ? 
    Object.keys(metrics.languageDistribution).length : 
    Object.keys(analysisResult.languages || {}).length;
  
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return 'N/A';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const metricCards = [
    {
      icon: <Code className="w-6 h-6 text-purple-500" />,
      label: 'Lines of Code',
      value: formatNumber(metrics.linesOfCode || 0),
      subtitle: `Across ${sourceFiles.toLocaleString()} source files`,
      color: 'purple',
      accurate: true,
    },
    {
      icon: <FileText className="w-6 h-6 text-blue-500" />,
      label: 'Total Files',
      value: (metrics.fileCount || 0).toLocaleString(),
      subtitle: `${sourceFiles.toLocaleString()} analyzable source files`,
      color: 'blue',
      accurate: true,
    },
    {
      icon: <GitCommit className="w-6 h-6 text-green-500" />,
      label: 'Total Commits',
      value: (metrics.totalCommits || 0).toLocaleString(),
      subtitle: 'Repository history',
      color: 'green',
      accurate: true,
    },
    {
      icon: <Users className="w-6 h-6 text-orange-500" />,
      label: 'Contributors',
      value: (metrics.totalContributors || 0).toLocaleString(),
      subtitle: 'Active developers',
      color: 'orange',
      accurate: true,
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-indigo-500" />,
      label: 'Avg Complexity',
      value: (metrics.avgComplexity || 0).toFixed(1),
      subtitle: 'Per file complexity score',
      color: 'indigo',
      accurate: metrics.avgComplexity !== undefined,
    },
    {
      icon: <Package className="w-6 h-6 text-cyan-500" />,
      label: 'Languages',
      value: languageCount.toString(),
      subtitle: 'Programming languages used',
      color: 'cyan',
      accurate: true,
    },
    {
      icon: <CheckSquare className="w-6 h-6 text-teal-500" />,
      label: 'Test Coverage',
      value: `${(metrics.testCoverage || 0).toFixed(1)}%`,
      subtitle: 'Code coverage percentage',
      color: 'teal',
      accurate: metrics.testCoverage !== undefined && metrics.testCoverage > 0,
    },
    {
      icon: <Star className="w-6 h-6 text-yellow-500" />,
      label: 'Quality Score',
      value: `${(metrics.codeQuality || 0).toFixed(1)}/10`,
      subtitle: 'Overall code quality',
      color: 'yellow',
      accurate: metrics.codeQuality !== undefined,
    },
    {
      icon: <Shield className="w-6 h-6 text-red-500" />,
      label: 'Security Score',
      value: `${(metrics.securityScore || 0).toFixed(1)}/10`,
      subtitle: `${(metrics.criticalVulnerabilities || 0) + (metrics.highVulnerabilities || 0)} critical/high issues`,
      color: 'red',
      accurate: metrics.securityScore !== undefined,
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
      label: 'Bus Factor',
      value: (metrics.busFactor || 0).toString(),
      subtitle: 'Knowledge concentration risk',
      color: 'amber',
      accurate: metrics.busFactor !== undefined,
    },
    {
      icon: <Activity className="w-6 h-6 text-pink-500" />,
      label: 'Technical Debt',
      value: (metrics.technicalDebtScore || 0).toString(),
      subtitle: 'Maintenance burden score',
      color: 'pink',
      accurate: metrics.technicalDebtScore !== undefined,
    },
    {
      icon: <Database className="w-6 h-6 text-emerald-500" />,
      label: 'Repository Size',
      value: formatSize(repositorySize),
      subtitle: 'Total repository size',
      color: 'emerald',
      accurate: repositorySize > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Repository Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {metricCards.map((card, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-lg border border-gray-200 ${
                card.accurate ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {card.icon}
                  <span className="ml-2 text-sm font-medium text-gray-600">{card.label}</span>
                </div>
                {card.accurate && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Accurate data"></div>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{card.value}</div>
              <div className="text-sm text-gray-500">{card.subtitle}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveMetricsPanel;
