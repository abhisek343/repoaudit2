import React from 'react';
import { CodeQualityMetrics } from '../config/quality';
import { defaultQualityConfig } from '../config/quality';

interface CodeQualityMetricsProps {
  metrics: CodeQualityMetrics;
}

export const CodeQualityMetricsDisplay: React.FC<CodeQualityMetricsProps> = ({ metrics }) => {
  const getStatusColor = (value: number, threshold: number, isLowerBetter: boolean = false) => {
    if (isLowerBetter) {
      return value <= threshold ? 'text-green-500' : 'text-red-500';
    }
    return value >= threshold ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Code Quality Metrics</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Cyclomatic Complexity</h3>
          <p className={getStatusColor(metrics.cyclomaticComplexity, defaultQualityConfig.maxCyclomaticComplexity, true)}>
            {metrics.cyclomaticComplexity} / {defaultQualityConfig.maxCyclomaticComplexity}
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">File Length</h3>
          <p className={getStatusColor(metrics.fileLength, defaultQualityConfig.maxFileLength, true)}>
            {metrics.fileLength} / {defaultQualityConfig.maxFileLength} lines
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Function Lengths</h3>
          <div className="space-y-1">
            {metrics.functionLengths.map((length, index) => (
              <p
                key={index}
                className={getStatusColor(length, defaultQualityConfig.maxFunctionLength, true)}
              >
                Function {index + 1}: {length} lines
              </p>
            ))}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Test Coverage</h3>
          <p className={getStatusColor(metrics.testCoverage, defaultQualityConfig.minTestCoverage)}>
            {metrics.testCoverage}% / {defaultQualityConfig.minTestCoverage}%
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Dependencies</h3>
          <p className={getStatusColor(metrics.dependencyCount, defaultQualityConfig.maxDependencies, true)}>
            {metrics.dependencyCount} / {defaultQualityConfig.maxDependencies}
          </p>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Legend:</p>
        <ul className="list-disc list-inside">
          <li className="text-green-500">Within acceptable range</li>
          <li className="text-red-500">Exceeds threshold</li>
        </ul>
      </div>
    </div>
  );
}; 