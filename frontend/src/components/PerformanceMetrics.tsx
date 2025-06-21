import React from 'react';
import { Zap, Database, Clock, AlertTriangle } from 'lucide-react';
import { AnalysisResult } from '../types';
import { shouldOptimize, formatLargeNumber, PERFORMANCE_LIMITS } from '../utils/performanceOptimization';

interface PerformanceMetricsProps {
  analysisResult: AnalysisResult;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ analysisResult }) => {
  const optimizations = shouldOptimize(analysisResult);
  const fileCount = analysisResult.files?.length || 0;
  const dependencyCount = analysisResult.dependencyGraph?.nodes?.length || 0;
  const commitCount = analysisResult.commits?.length || 0;
  
  // Calculate repository scale
  const getRepositoryScale = () => {
    if (fileCount > 10000) return { scale: 'Massive', color: 'red', description: 'Enterprise-level repository' };
    if (fileCount > 1000) return { scale: 'Large', color: 'orange', description: 'Large-scale project' };
    if (fileCount > 100) return { scale: 'Medium', color: 'yellow', description: 'Medium-sized project' };
    return { scale: 'Small', color: 'green', description: 'Small project' };
  };

  const { scale, color, description } = getRepositoryScale();

  const metrics = [
    {
      icon: <Database className="w-5 h-5" />,
      label: 'Total Files',
      value: formatLargeNumber(fileCount),
      optimized: optimizations.files,
      threshold: PERFORMANCE_LIMITS.MAX_FILE_LIST_DISPLAY,
    },
    {
      icon: <Zap className="w-5 h-5" />,
      label: 'Dependencies',
      value: formatLargeNumber(dependencyCount),
      optimized: optimizations.dependencies,
      threshold: PERFORMANCE_LIMITS.MAX_DEPENDENCY_NODES,
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: 'Commit History',
      value: formatLargeNumber(commitCount),
      optimized: optimizations.commits,
      threshold: PERFORMANCE_LIMITS.MAX_COMMITS_DISPLAY,
    },
  ];

  const hasOptimizations = Object.values(optimizations).some(Boolean);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Zap className="w-6 h-6 text-purple-600 mr-3" />
          <h3 className="text-xl font-bold text-gray-900">Performance Metrics</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          color === 'red' ? 'bg-red-100 text-red-800' :
          color === 'orange' ? 'bg-orange-100 text-orange-800' :
          color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {scale} Repository
        </div>
      </div>

      {/* Repository Scale Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <p className="text-xs text-gray-500">
          Analysis method: Archive-based download for optimal performance
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-purple-600">{metric.icon}</span>
                <span className="ml-2 text-sm font-medium text-gray-600">{metric.label}</span>
              </div>
              {metric.optimized && (
                <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  Optimized
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
            <div className="text-xs text-gray-500">
              {metric.optimized 
                ? `Showing optimized view (>${formatLargeNumber(metric.threshold)})` 
                : 'Full dataset displayed'
              }
            </div>
          </div>
        ))}
      </div>

      {/* Optimization Status */}
      {hasOptimizations && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-orange-900 mb-2">
                Performance Optimizations Applied
              </h4>
              <p className="text-sm text-orange-700 mb-3">
                Due to the large size of this repository, some views have been optimized to ensure smooth performance.
              </p>
              <ul className="text-sm text-orange-700 space-y-1">
                {optimizations.files && (
                  <li>• File listings limited to top {PERFORMANCE_LIMITS.MAX_FILE_LIST_DISPLAY} items with search/filter</li>
                )}
                {optimizations.dependencies && (
                  <li>• Dependency graphs show top {PERFORMANCE_LIMITS.MAX_DEPENDENCY_NODES} most important nodes</li>
                )}
                {optimizations.commits && (
                  <li>• Commit history displays most recent {PERFORMANCE_LIMITS.MAX_COMMITS_DISPLAY} commits</li>
                )}
                {optimizations.languages && (
                  <li>• Language statistics grouped with "Others" category</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Performance Benefits */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Archive-Based Analysis Benefits
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-700">
              <div>
                <span className="font-medium">🚀 Performance:</span> Up to 10x faster than file-by-file fetching
              </div>
              <div>
                <span className="font-medium">🔄 Reliability:</span> No GitHub API rate limit issues
              </div>
              <div>
                <span className="font-medium">📈 Scalability:</span> Handles repositories with 10,000+ files
              </div>
              <div>
                <span className="font-medium">🛡️ Consistency:</span> All files from same commit/branch
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
