import React from 'react';
import { AnalysisResult } from '../types';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react'; // For visual cues
import VisualizationErrorBoundary from './VisualizationErrorBoundary';

interface CodeQualityMetricsProps {
  metrics?: AnalysisResult['metrics'];
}

export const CodeQualityMetricsDisplay: React.FC<CodeQualityMetricsProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <VisualizationErrorBoundary>
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-100 text-center">
          <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No code quality data available.</p>
        </div>
      </VisualizationErrorBoundary>
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

  const linesStatus = getStatus(metrics.linesOfCode, 10000, 50000, false);
  const commitsStatus = getStatus(metrics.totalCommits, 100, 50, false);

  return (
    <VisualizationErrorBoundary>
      <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Code Quality Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <MetricItem 
              label="Lines of Code" 
              value={metrics.linesOfCode.toLocaleString()} 
              status={linesStatus} 
              threshold="-" />
          <MetricItem 
              label="Commits" 
              value={metrics.totalCommits.toLocaleString()} 
              status={commitsStatus} 
              threshold="-" />
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <strong>Note:</strong> Displaying available core metrics.
        </div>
      </div>
    </VisualizationErrorBoundary>
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
