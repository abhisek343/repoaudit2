import React, { useState } from 'react';
import { FileText, Code, Layers, TrendingUp, AlertCircle, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
import { AnalysisResult } from '../types';
import { optimizeLanguageStats, formatLargeNumber, shouldOptimize } from '../utils/performanceOptimization';
import EnhancedFileList from './EnhancedFileList';

interface FileAnalysisOverviewProps {
  analysisResult: AnalysisResult;
}

export const FileAnalysisOverview: React.FC<FileAnalysisOverviewProps> = ({ analysisResult }) => {
  const [showDetailedFileList, setShowDetailedFileList] = useState(false);
  const files = analysisResult.files || [];
  
  // Check if optimizations should be applied
  const optimizations = shouldOptimize(analysisResult);
  
  // Calculate comprehensive file statistics
  const sourceFiles = files.filter(f => f.content && f.language && f.language !== 'text');
  const totalLinesOfCode = sourceFiles.reduce((sum, f) => {
    return sum + (f.content ? f.content.split('\n').length : 0);
  }, 0);
  
  const filesWithComplexity = sourceFiles.filter(f => f.complexity && f.complexity > 0);
  const avgComplexity = filesWithComplexity.length > 0 
    ? filesWithComplexity.reduce((sum, f) => sum + (f.complexity || 0), 0) / filesWithComplexity.length
    : 0;
  
  const highComplexityFiles = filesWithComplexity.filter(f => (f.complexity || 0) > 10);
  
  // Group by language
  const rawLanguageStats = sourceFiles.reduce((acc, file) => {
    const lang = file.language || 'Unknown';
    if (!acc[lang]) {
      acc[lang] = { count: 0, loc: 0, avgComplexity: 0 };
    }
    acc[lang].count++;
    acc[lang].loc += file.content ? file.content.split('\n').length : 0;
    if (file.complexity) {
      acc[lang].avgComplexity = (acc[lang].avgComplexity + file.complexity) / acc[lang].count;
    }
    return acc;
  }, {} as Record<string, { count: number; loc: number; avgComplexity: number }>);
  
  // Apply optimization to language stats if needed
  const { stats: languageStats, isOptimized: languageOptimized } = optimizeLanguageStats(rawLanguageStats);
  
  // Top complex files
  const topComplexFiles = filesWithComplexity
    .sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
    .slice(0, 5);

  const fileStats = [    {
      icon: <FileText className="w-6 h-6 text-blue-500" />,
      label: 'Total Files Analyzed',
      value: formatLargeNumber(files.length),
      subtitle: `${sourceFiles.length} source files`,
    },
    {
      icon: <Code className="w-6 h-6 text-green-500" />,
      label: 'Lines of Code',
      value: totalLinesOfCode > 1000 ? 
        `${(totalLinesOfCode / 1000).toFixed(1)}K` : 
        totalLinesOfCode.toLocaleString(),
      subtitle: 'Analyzed from repository archive',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-purple-500" />,
      label: 'Average Complexity',
      value: avgComplexity.toFixed(1),
      subtitle: `${highComplexityFiles.length} high complexity files`,
    },
    {
      icon: <Layers className="w-6 h-6 text-indigo-500" />,
      label: 'Programming Languages',
      value: Object.keys(languageStats).length.toString(),
      subtitle: 'Detected languages',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">      <div className="flex items-center mb-6">
        <GitBranch className="w-6 h-6 text-indigo-600 mr-3" />
        <h3 className="text-xl font-bold text-gray-900">File Analysis Overview</h3>
        <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          Archive Method ✓
        </span>
        {optimizations.files && (
          <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
            Optimized View
          </span>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {fileStats.map((stat, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              {stat.icon}
              <span className="ml-2 text-sm font-medium text-gray-600">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.subtitle}</div>
          </div>
        ))}
      </div>      {/* Language Breakdown */}
      {Object.keys(languageStats).length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            Language Breakdown
            {languageOptimized && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Top {Object.keys(languageStats).length - (languageStats.Others ? 1 : 0)} + Others
              </span>
            )}
          </h4>          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(languageStats)
              .sort(([,a], [,b]) => b.loc - a.loc)
              .map(([language, stats]) => (
                <div key={language} className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900">{language}</div>
                  <div className="text-sm text-gray-600">
                    {stats.count} files • {stats.loc.toLocaleString()} LOC
                  </div>
                  {stats.avgComplexity > 0 && (
                    <div className="text-xs text-gray-500">
                      Avg complexity: {stats.avgComplexity.toFixed(1)}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Most Complex Files */}
      {topComplexFiles.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
            Most Complex Files
          </h4>
          <div className="space-y-2">            {topComplexFiles.map((file) => (
              <div key={file.path} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">{file.name}</div>
                  <div className="text-xs text-gray-500">{file.path}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-orange-600">{file.complexity?.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">complexity</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}      {/* Analysis Method Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h5 className="text-sm font-medium text-blue-900">Enhanced Archive Analysis</h5>
            <p className="text-sm text-blue-700">
              This analysis used the repository archive download method to comprehensively analyze all {formatLargeNumber(files.length)} files 
              in a single API call, providing complete code coverage and detailed metrics.
            </p>
            <div className="mt-3">
              <button
                onClick={() => setShowDetailedFileList(!showDetailedFileList)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                {showDetailedFileList ? (
                  <>
                    Hide detailed file list
                    <ChevronUp className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Show detailed file list
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced File List */}
      {showDetailedFileList && (
        <div className="mt-6">
          <EnhancedFileList 
            files={files} 
            title="Detailed File Analysis"
          />
        </div>
      )}
    </div>
  );
};

export default FileAnalysisOverview;
