import React from 'react';
import { DependencyConfig } from '../config/dependencies.config';
import { defaultDependencyConfig } from '../config/dependencies.config';

interface DependencyMetricsProps {
  config: DependencyConfig;
  currentMetrics: {
    totalDependencies: number;
    devDependencies: number;
    outdatedPackages: number;
    vulnerablePackages: number;
    lastScan: Date;
    dependencyScore: number;
  };
}

export const DependencyMetricsDisplay: React.FC<DependencyMetricsProps> = ({ config, currentMetrics }) => {
  const getStatusColor = (value: number, threshold: number, isLowerBetter: boolean = false) => {
    if (isLowerBetter) {
      return value <= threshold ? 'text-green-500' : 'text-yellow-500';
    }
    return value >= threshold ? 'text-green-500' : 'text-yellow-500';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Dependency Metrics</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Dependency Count</h3>
          <p className={getStatusColor(currentMetrics.totalDependencies, config.rules.maxDependencies, true)}>
            Total Dependencies: {currentMetrics.totalDependencies} / {config.rules.maxDependencies}
          </p>
          <p className={getStatusColor(currentMetrics.devDependencies, config.rules.maxDevDependencies, true)}>
            Dev Dependencies: {currentMetrics.devDependencies} / {config.rules.maxDevDependencies}
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Package Health</h3>
          <p className={getStatusColor(currentMetrics.outdatedPackages, 5, true)}>
            Outdated Packages: {currentMetrics.outdatedPackages}
          </p>
          <p className={getStatusColor(currentMetrics.vulnerablePackages, 0, true)}>
            Vulnerable Packages: {currentMetrics.vulnerablePackages}
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Dependency Score</h3>
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full"
                style={{
                  width: `${currentMetrics.dependencyScore}%`,
                  backgroundColor: currentMetrics.dependencyScore >= 80 ? '#10B981' : '#F59E0B'
                }}
              ></div>
            </div>
            <span className="ml-2">{currentMetrics.dependencyScore}%</span>
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Update Status</h3>
          <p>Last Scan: {formatDate(currentMetrics.lastScan)}</p>
          <p>Update Frequency: {config.versioning.updateFrequency}</p>
        </div>

        <div className="p-3 bg-gray-50 rounded col-span-2">
          <h3 className="font-semibold">Security Settings</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p>Security Scanning: {config.security.enabled ? 'Enabled' : 'Disabled'}</p>
              <p>Scan Frequency: {config.security.scanFrequency}</p>
            </div>
            <div>
              <p>Minimum Severity: {config.security.minimumSeverity}</p>
              <p>Fail on Vulnerability: {config.security.failOnVulnerability ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Legend:</p>
        <ul className="list-disc list-inside">
          <li className="text-green-500">Within acceptable range</li>
          <li className="text-yellow-500">Approaching threshold</li>
        </ul>
      </div>
    </div>
  );
}; 