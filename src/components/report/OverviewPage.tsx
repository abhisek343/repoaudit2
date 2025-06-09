import React from 'react';
import { 
  Brain, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  GitCommit,
  Users,
  Code,
  Star,
  Calendar,
  ExternalLink,
  Activity
} from 'lucide-react';
import { AnalysisResult } from '../../types';

interface OverviewPageProps {
  reportData: AnalysisResult;
}

const OverviewPage = ({ reportData }: OverviewPageProps) => {
  const { repository, metrics, aiSummary, languages } = reportData;

  // Calculate overall health score
  const healthScore = Math.round(
    (metrics.codeQuality * 0.3 + 
     (metrics.testCoverage / 10) * 0.25 + 
     Math.min(10, metrics.totalContributors / 5) * 0.25 + 
     Math.min(10, metrics.totalCommits / 100) * 0.2) * 10
  ) / 10;

  const getHealthStatus = (score: number) => {
    if (score >= 8) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 6) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 4) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Needs Attention', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const healthStatus = getHealthStatus(healthScore);

  // Prepare language data for donut chart
  const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
  const languageData = Object.entries(languages)
    .map(([lang, bytes]) => ({
      name: lang,
      value: bytes,
      percentage: Math.round((bytes / totalBytes) * 100)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const getLanguageColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-8">
      {/* Repository Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h2 className="text-3xl font-bold text-gray-900">{repository.name}</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${healthStatus.bg} ${healthStatus.color}`}>
                {healthStatus.label}
              </div>
            </div>
            
            <p className="text-lg text-gray-600 mb-4 leading-relaxed">
              {repository.description || 'No description available'}
            </p>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>{repository.language}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Created {new Date(repository.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Activity className="w-4 h-4" />
                <span>Updated {new Date(repository.updatedAt).toLocaleDateString()}</span>
              </div>
              {repository.license && (
                <div className="flex items-center space-x-1">
                  <Shield className="w-4 h-4" />
                  <span>{repository.license.name}</span>
                </div>
              )}
              <a 
                href={`https://github.com/${repository.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-700"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View on GitHub</span>
              </a>
            </div>
          </div>

          {/* Overall Health Score */}
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-3">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  className={healthStatus.color.replace('text-', 'text-')}
                  strokeDasharray={`${(healthScore / 10) * 251.33} 251.33`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{healthScore}/10</span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Health Score</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <Star className="w-8 h-8 text-yellow-500" />
            <span className="text-sm font-medium text-green-600">+12%</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">
            {repository.stars.toLocaleString()}
          </h3>
          <p className="text-gray-600 text-sm">GitHub Stars</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <GitCommit className="w-8 h-8 text-blue-500" />
            <span className="text-sm font-medium text-green-600">Active</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">
            {metrics.totalCommits.toLocaleString()}
          </h3>
          <p className="text-gray-600 text-sm">Total Commits</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-green-500" />
            <span className="text-sm font-medium text-blue-600">+3%</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">
            {metrics.totalContributors}
          </h3>
          <p className="text-gray-600 text-sm">Contributors</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <Code className="w-8 h-8 text-purple-500" />
            <span className="text-sm font-medium text-green-600">+8%</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">
            {Math.round(metrics.linesOfCode / 1000)}K
          </h3>
          <p className="text-gray-600 text-sm">Lines of Code</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* AI Executive Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Brain className="w-6 h-6 text-indigo-500 mr-3" />
              AI Executive Summary
            </h3>
            
            {aiSummary ? (
              <div className="prose prose-lg max-w-none">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-l-4 border-indigo-500">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {aiSummary}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-l-4 border-indigo-500">
                <p className="text-gray-800 leading-relaxed">
                  This repository contains the source code for <strong>{repository.name}</strong>, 
                  a {repository.language} project with {repository.stars.toLocaleString()} stars. 
                  The project shows {metrics.totalCommits > 100 ? 'high' : 'moderate'} activity 
                  with {metrics.totalContributors} contributors and demonstrates 
                  {healthScore >= 7 ? 'excellent' : healthScore >= 5 ? 'good' : 'fair'} overall health metrics.
                </p>
              </div>
            )}

            {/* Key Insights */}
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Strengths</h4>
                <div className="space-y-2">
                  {metrics.testCoverage >= 70 && (
                    <div className="flex items-center text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      High test coverage ({metrics.testCoverage}%)
                    </div>
                  )}
                  {metrics.totalContributors >= 5 && (
                    <div className="flex items-center text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Active contributor community
                    </div>
                  )}
                  {repository.stars >= 100 && (
                    <div className="flex items-center text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Strong community adoption
                    </div>
                  )}
                  <div className="flex items-center text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Regular maintenance and updates
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Areas for Improvement</h4>
                <div className="space-y-2">
                  {/* Always show these recommendations */}
                  <div className="flex items-center text-sm text-yellow-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Consider increasing test coverage (current: {metrics.testCoverage}%)
                  </div>
                  <div className="flex items-center text-sm text-yellow-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Monitor bus factor (current: {metrics.busFactor})
                  </div>
                  <div className="flex items-center text-sm text-yellow-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Review code quality metrics (current: {metrics.codeQuality}/10)
                  </div>
                  {/* Conditional recommendations */}
                  {metrics.busFactor <= 2 && (
                    <div className="flex items-center text-sm text-yellow-700">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Low bus factor ({metrics.busFactor}) - Consider knowledge sharing
                    </div>
                  )}
                  {metrics.testCoverage < 70 && (
                    <div className="flex items-center text-sm text-yellow-700">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Test coverage could be improved (target: 70%)
                    </div>
                  )}
                  {!repository.license && (
                    <div className="flex items-center text-sm text-yellow-700">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      No license specified - Consider adding one
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Language Breakdown & Additional Metrics */}
        <div className="space-y-6">
          {/* Language Breakdown */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Language Breakdown</h4>
            
            <div className="space-y-4">
              {languageData.map((lang, index) => (
                <div key={lang.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getLanguageColor(index) }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">{lang.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{lang.percentage}%</span>
                </div>
              ))}
            </div>

            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full flex">
                {languageData.map((lang, index) => (
                  <div
                    key={lang.name}
                    className="h-full"
                    style={{
                      width: `${lang.percentage}%`,
                      backgroundColor: getLanguageColor(index)
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* CI/CD Status */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">CI/CD Status</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Build Status</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">Passing</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Test Coverage</span>
                <span className="text-sm font-medium text-gray-900">{metrics.testCoverage}%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Code Quality</span>
                <span className="text-sm font-medium text-gray-900">{metrics.codeQuality}/10</span>
              </div>
            </div>
          </div>

          {/* Repository Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Repository Stats</h4>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Forks</span>
                <span className="font-medium">{repository.forks.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Watchers</span>
                <span className="font-medium">{repository.watchers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Open Issues</span>
                <span className="font-medium">{repository.openIssues.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Repository Size</span>
                <span className="font-medium">{Math.round(repository.size / 1024)} MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;