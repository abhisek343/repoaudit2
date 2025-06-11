import React from 'react';
import { CodeQualityMetricsSummary } from '../types'; // Assuming this type is defined
import { CheckCircle, AlertTriangle, Info } from 'lucide-react'; // For visual cues

// Default thresholds - these could also come from a config or be dynamic
const QUALITY_THRESHOLDS = {
  avgComplexity: { good: 10, moderate: 20 }, // Lower is better
  testCoverage: { good: 80, moderate: 60 }, // Higher is better
  duplication: { good: 5, moderate: 10 }, // Lower is better
  maintainabilityIndex: { good: 85, moderate: 65 }, // Higher is better
  issuesCritical: { good: 0, moderate: 0 }, // Lower is better
  issuesMajor: { good: 5, moderate: 10 }, // Lower is better
};

interface CodeQualityMetricsProps {
  metrics?: CodeQualityMetricsSummary; // Make metrics optional
}

export const CodeQualityMetricsDisplay: React.FC<CodeQualityMetricsProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Code Quality Metrics</h2>
        <div className="text-center py-10 text-gray-500">
            <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Code quality metrics are not available for this report.</p>
            <p className="text-sm">This may require specific static analysis tools or LLM processing.</p>
        </div>
      </div>
    );
  }

  const getStatus = (value: number, goodThreshold: number, moderateThreshold: number, lowerIsBetter: boolean = false): {label: string; colorClass: string; icon: React.ReactNode} => {
    if (lowerIsBetter) {
      if (value <= goodThreshold) return { label: 'Good', colorClass: 'text-green-600', icon: <CheckCircle className="w-4 h-4" /> };
      if (value <= moderateThreshold) return { label: 'Fair', colorClass: 'text-yellow-600', icon: <AlertTriangle className="w-4 h-4" /> };
      return { label: 'Needs Attention', colorClass: 'text-red-600', icon: <AlertTriangle className="w-4 h-4" /> };
    }
    if (value >= goodThreshold) return { label: 'Good', colorClass: 'text-green-600', icon: <CheckCircle className="w-4 h-4" /> };
    if (value >= moderateThreshold) return { label: 'Fair', colorClass: 'text-yellow-600', icon: <AlertTriangle className="w-4 h-4" /> };
    return { label: 'Needs Attention', colorClass: 'text-red-600', icon: <AlertTriangle className="w-4 h-4" /> };
  };

  const avgComplexityStatus = getStatus(metrics.averageComplexity, QUALITY_THRESHOLDS.avgComplexity.good, QUALITY_THRESHOLDS.avgComplexity.moderate, true);
  const testCoverageStatus = getStatus(metrics.testCoveragePercentage, QUALITY_THRESHOLDS.testCoverage.good, QUALITY_THRESHOLDS.testCoverage.moderate);
  const duplicationStatus = getStatus(metrics.duplicationPercentage, QUALITY_THRESHOLDS.duplication.good, QUALITY_THRESHOLDS.duplication.moderate, true);
  const maintainabilityStatus = metrics.maintainabilityIndex !== undefined ? getStatus(metrics.maintainabilityIndex, QUALITY_THRESHOLDS.maintainabilityIndex.good, QUALITY_THRESHOLDS.maintainabilityIndex.moderate) : null;

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Code Quality Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <MetricItem 
            label="Avg. Cyclomatic Complexity" 
            value={metrics.averageComplexity.toFixed(1)} 
            status={avgComplexityStatus} 
            threshold={`Good < ${QUALITY_THRESHOLDS.avgComplexity.good}`}
        />
        <MetricItem 
            label="Test Coverage" 
            value={`${metrics.testCoveragePercentage.toFixed(1)}%`}
            status={testCoverageStatus}
            threshold={`Good > ${QUALITY_THRESHOLDS.testCoverage.good}%`}
        />
        <MetricItem 
            label="Code Duplication" 
            value={`${metrics.duplicationPercentage.toFixed(1)}%`}
            status={duplicationStatus}
            threshold={`Good < ${QUALITY_THRESHOLDS.duplication.good}%`}
        />
        {metrics.maintainabilityIndex !== undefined && maintainabilityStatus && (
             <MetricItem 
                label="Maintainability Index" 
                value={metrics.maintainabilityIndex.toFixed(0)}
                status={maintainabilityStatus}
                threshold={`Good > ${QUALITY_THRESHOLDS.maintainabilityIndex.good}`}
            />
        )}
        <div className="md:col-span-2 pt-4 mt-2 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Issue Counts:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                <IssueCountItem label="Blocker" count={metrics.issuesCount.blocker} color="bg-red-600" />
                <IssueCountItem label="Critical" count={metrics.issuesCount.critical} color="bg-red-500" />
                <IssueCountItem label="Major" count={metrics.issuesCount.major} color="bg-orange-500" />
                <IssueCountItem label="Minor" count={metrics.issuesCount.minor} color="bg-yellow-500" />
                <IssueCountItem label="Info" count={metrics.issuesCount.info} color="bg-blue-500" />
            </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p><strong>Note:</strong> These metrics provide a high-level overview. Thresholds are indicative.</p>
      </div>
    </div>
  );
};

const MetricItem: React.FC<{label: string; value: string; status: {label: string; colorClass: string; icon: React.ReactNode}; threshold: string}> = 
({label, value, status, threshold}) => (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-sm text-gray-700 mb-1">{label}</h3>
        <div className="flex items-center justify-between">
            <p className={`text-2xl font-bold ${status.colorClass}`}>{value}</p>
            <div className={`flex items-center text-xs px-2 py-1 rounded-full ${status.colorClass.replace('text-', 'bg-').replace('-600', '-100')} ${status.colorClass}`}>
                {React.cloneElement(status.icon as React.ReactElement, {className: "w-3.5 h-3.5 mr-1"})}
                {status.label}
            </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{threshold}</p>
    </div>
);

const IssueCountItem: React.FC<{label: string; count: number; color: string}> = ({label, count, color}) => (
    <div className={`p-2 rounded text-white text-center shadow ${color}`}>
        <div className="font-bold">{count}</div>
        <div>{label}</div>
    </div>
);
