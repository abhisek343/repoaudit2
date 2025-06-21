import { AnalysisResult } from '../../types';
import ExecutiveSummary from '../ExecutiveSummary';
import MetricsGrid from '../MetricsGrid';
import FileAnalysisOverview from '../FileAnalysisOverview';
import AnalysisMethodInfo from '../AnalysisMethodInfo';
import PerformanceMetrics from '../PerformanceMetrics';

interface OverviewPageProps {
  analysisResult: AnalysisResult;
}

export function OverviewPage({ analysisResult }: OverviewPageProps) {
  // Use optional chaining and default values directly for cleaner access
  const basicInfo = analysisResult?.basicInfo || {};
  const metrics = analysisResult?.metrics || {};

  const vitals = [
    { name: 'Stars', value: basicInfo.stars, icon: '⭐' },
    { name: 'Forks', value: basicInfo.forks, icon: '🍴' },
    { name: 'File Count', value: metrics.fileCount, icon: '📄' },
    { name: 'Critical Vulnerabilities', value: metrics.criticalVulnerabilities, icon: '🔥' },
    { name: 'High Vulnerabilities', value: metrics.highVulnerabilities, icon: '🔶' },
  ];  return (
    <div className="space-y-6">
      {/* Enhanced Metrics Grid with comprehensive archive data */}
      <MetricsGrid 
        metrics={analysisResult.metrics} 
        analysisResult={analysisResult} 
      />

      {/* Performance Metrics for Large Repositories */}
      <PerformanceMetrics analysisResult={analysisResult} />

      {/* Repository Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">{basicInfo.fullName || 'N/A'}</h2>
        <p className="text-gray-600 mb-4">{basicInfo.description || 'No description available.'}</p>
        
        {/* Language Distribution if available */}
        {analysisResult.languages && Object.keys(analysisResult.languages).length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">Language Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analysisResult.languages)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([language, bytes]) => {
                  const percentage = (bytes / Object.values(analysisResult.languages!).reduce((a, b) => a + b, 0)) * 100;
                  return (
                    <span 
                      key={language} 
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {language} ({percentage.toFixed(1)}%)
                    </span>
                  );
                })}
            </div>
          </div>        )}
      </div>      {/* File Analysis Overview - showcasing archive method benefits */}
      <FileAnalysisOverview analysisResult={analysisResult} />

      {/* Analysis Method Performance Info */}
      <AnalysisMethodInfo analysisResult={analysisResult} />

      {/* Vitals */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-3">Vitals</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {vitals.map((vital, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl">{vital.icon}</div>
              <div className="text-xl font-bold text-gray-800">{vital.value?.toLocaleString() ?? 'N/A'}</div>
              <div className="text-gray-600">{vital.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Summary using ExecutiveSummary component */}
      <ExecutiveSummary reportData={{ 
        basicInfo: analysisResult.basicInfo, 
        metrics: analysisResult.metrics,
        dependencyMetrics: analysisResult.dependencyMetrics || {
          totalDependencies: 0,
          devDependencies: 0,
          outdatedPackages: 0,
          vulnerablePackages: 0,
          criticalVulnerabilities: 0,
          highVulnerabilities: 0,
          mediumVulnerabilities: 0,
          lowVulnerabilities: 0,
          lastScan: '',
          dependencyScore: 0,
          packageDependencyGraph: { nodes: [], links: [] },
          vulnerabilityDistribution: []
        },
        hotspots: analysisResult.hotspots || []
      }} />

      {/* Repository Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-3">Repository Details</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Language</dt>
            <dd className="mt-1 text-sm text-gray-900">{basicInfo.language || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{basicInfo.createdAt ? new Date(basicInfo.createdAt).toLocaleDateString() : 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">{basicInfo.updatedAt ? new Date(basicInfo.updatedAt).toLocaleDateString() : 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Default Branch</dt>
            <dd className="mt-1 text-sm text-gray-900">{basicInfo.defaultBranch || 'N/A'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default OverviewPage;
