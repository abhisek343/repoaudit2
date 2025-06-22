import React from 'react';
import { 
  Clock, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Zap,
  FileText,
  Activity,
  TrendingUp,
  Shield,
  Database
} from 'lucide-react';
import { AnalysisResult } from '../types';

interface AnalysisMethodInfoProps {
  analysisResult: AnalysisResult;
}

export const AnalysisMethodInfo: React.FC<AnalysisMethodInfoProps> = ({ analysisResult }) => {
  const files = analysisResult.files || [];
  const sourceFiles = files.filter(f => f.content && f.language && f.language !== 'text');
  const actualMethod = analysisResult.analysisMethod || 'archive';
  
  // Calculate the estimated API calls that would have been needed with individual file method
  const estimatedIndividualCalls = Math.min(sourceFiles.length, 800); // Typical limit for individual calls
  const actualArchiveCalls = actualMethod === 'archive' ? 1 : estimatedIndividualCalls;
  const apiCallsSaved = estimatedIndividualCalls - actualArchiveCalls;
  
  // Enhanced performance metrics
  const totalLOC = analysisResult.metrics?.linesOfCode || 0;
  const avgFileSize = sourceFiles.length > 0 ? 
    sourceFiles.reduce((sum, f) => sum + f.size, 0) / sourceFiles.length : 0;
  const languageCount = analysisResult.metrics?.languageDistribution ? 
    Object.keys(analysisResult.metrics.languageDistribution).length :
    Object.keys(analysisResult.languages || {}).length;
  const complexityFiles = analysisResult.metrics?.filesWithComplexity || 0;
  
  const benefits = [
    {
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      title: 'Single API Call',
      description: 'Downloaded entire repository in one request',
      value: '1 call',
      comparison: `vs ${estimatedIndividualCalls.toLocaleString()} individual calls`,
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: 'Complete Coverage',
      description: 'Analyzed all repository files without pagination',
      value: `${files.length.toLocaleString()} files`,
      comparison: `${sourceFiles.length.toLocaleString()} source files processed`,
    },
    {
      icon: <Clock className="w-5 h-5 text-blue-500" />,
      title: 'Faster Analysis',
      description: 'No rate limiting delays between file requests',
      value: 'Instant',
      comparison: 'No API request queuing',
    },
    {
      icon: <Shield className="w-5 h-5 text-purple-500" />,
      title: 'Rate Limit Friendly',
      description: 'Preserves API quota for other operations',
      value: `${apiCallsSaved} calls saved`,
      comparison: 'More quota available',
    },
  ];

  const methodComparison = [    {
      method: 'Archive Download',
      icon: <Download className="w-5 h-5 text-green-500" />,
      status: actualMethod === 'archive' ? 'Used' : 'Available',
      apiCalls: 1,
      coverage: '100%',
      speed: 'Fast',
      reliability: 'High',
      color: actualMethod === 'archive' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200',
    },
    {
      method: 'Individual Files',
      icon: <FileText className="w-5 h-5 text-orange-500" />,
      status: actualMethod === 'individual' ? 'Used (Fallback)' : 'Fallback',
      apiCalls: estimatedIndividualCalls,
      coverage: `~${Math.min(100, (800 / Math.max(sourceFiles.length, 1)) * 100).toFixed(0)}%`,
      speed: 'Slower',
      reliability: 'Rate limited',
      color: actualMethod === 'individual' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Activity className="w-6 h-6 text-indigo-600 mr-3" />
        <h3 className="text-xl font-bold text-gray-900">Analysis Method Performance</h3>
      </div>

      {/* Archive Method Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {benefits.map((benefit, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              {benefit.icon}
              <span className="ml-2 font-semibold text-gray-900">{benefit.title}</span>
            </div>
            <div className="text-lg font-bold text-gray-800 mb-1">{benefit.value}</div>
            <div className="text-xs text-gray-600 mb-2">{benefit.description}</div>
            <div className="text-xs text-blue-600 font-medium">{benefit.comparison}</div>
          </div>
        ))}
      </div>

      {/* Method Comparison */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <TrendingUp className="w-5 h-5 text-indigo-500 mr-2" />
          Method Comparison
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {methodComparison.map((method, index) => (
            <div key={index} className={`rounded-lg border p-4 ${method.color}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  {method.icon}
                  <span className="ml-2 font-semibold text-gray-900">{method.method}</span>
                </div>                <span className={`px-2 py-1 text-xs rounded-full ${
                  method.status.includes('Used') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {method.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">API Calls:</span>
                  <div className="font-semibold">{method.apiCalls}</div>
                </div>
                <div>
                  <span className="text-gray-600">Coverage:</span>
                  <div className="font-semibold">{method.coverage}</div>
                </div>
                <div>
                  <span className="text-gray-600">Speed:</span>
                  <div className="font-semibold">{method.speed}</div>
                </div>
                <div>
                  <span className="text-gray-600">Reliability:</span>
                  <div className="font-semibold">{method.reliability}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>      {/* Analysis Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center mb-2">
            <Database className="w-5 h-5 text-blue-500" />
            <span className="ml-2 font-semibold text-blue-900">Lines of Code</span>
          </div>
          <div className="text-2xl font-bold text-blue-800">{totalLOC.toLocaleString()}</div>
          <div className="text-sm text-blue-600">Analyzed from repository archive</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center mb-2">
            <FileText className="w-5 h-5 text-purple-500" />
            <span className="ml-2 font-semibold text-purple-900">Source Files</span>
          </div>
          <div className="text-2xl font-bold text-purple-800">{sourceFiles.length.toLocaleString()}</div>
          <div className="text-sm text-purple-600">Files with complexity analysis</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center mb-2">
            <Activity className="w-5 h-5 text-green-500" />
            <span className="ml-2 font-semibold text-green-900">Languages</span>
          </div>
          <div className="text-2xl font-bold text-green-800">{languageCount}</div>
          <div className="text-sm text-green-600">Programming languages detected</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center mb-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <span className="ml-2 font-semibold text-orange-900">Complexity</span>
          </div>
          <div className="text-2xl font-bold text-orange-800">{complexityFiles}</div>
          <div className="text-sm text-orange-600">Files with complexity metrics</div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h5 className="font-semibold text-gray-900 mb-2 flex items-center">
          <AlertCircle className="w-4 h-4 text-gray-600 mr-2" />
          Technical Details
        </h5>
        <div className="text-sm text-gray-700 space-y-1">
          <p>
            <strong>Archive Method:</strong> Downloads the entire repository as a ZIP file in a single GitHub API call,
            then extracts and analyzes files locally for comprehensive coverage.
          </p>
          <p>
            <strong>Fallback Strategy:</strong> If archive download fails (network issues, large repos), 
            automatically falls back to individual file fetching with intelligent prioritization.
          </p>
          <p>
            <strong>Benefits:</strong> Eliminates rate limiting bottlenecks, provides complete repository coverage,
            and enables analysis of repositories with hundreds of files efficiently.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisMethodInfo;
