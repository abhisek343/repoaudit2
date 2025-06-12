import React from 'react';
import { DependencyConfig } from '../config/dependencies.config';
// We won't import defaultDependencyConfig directly, it should be passed via props or derived
import { ShieldCheck, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react'; // Added icons

interface CurrentDependencyMetrics {
  totalDependencies: number;
  devDependencies: number;
  outdatedPackages: number;
  vulnerablePackages: number; // Count of packages with known vulnerabilities
  criticalVulnerabilities: number; // Specifically critical ones
  highVulnerabilities: number; // Specifically high ones
  lastScan?: string; // ISO Date string
  dependencyScore?: number; // 0-100 score
}

interface DependencyMetricsProps {
  config: DependencyConfig; // This would be your project's specific rules
  currentMetrics?: CurrentDependencyMetrics; // Make it optional
}

export const DependencyMetricsDisplay: React.FC<DependencyMetricsProps> = ({ config, currentMetrics }) => {
  if (!currentMetrics) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Dependency Health</h2>
        <div className="text-center py-10 text-gray-500">
            <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Dependency metrics are not available for this report.</p>
        </div>
      </div>
    );
  }

  const getStatus = (value: number, threshold: number, isLowerBetter: boolean = false): {label: string; colorClass: string; icon: React.ReactNode} => {
    const good = isLowerBetter ? value <= threshold : value >= threshold;
    const moderateThreshold = isLowerBetter ? threshold * 1.25 : threshold * 0.75; // Example for moderate
    const moderate = isLowerBetter ? value <= moderateThreshold : value >= moderateThreshold;

    if (good) return { label: 'Good', colorClass: 'text-green-600', icon: <CheckCircle className="w-4 h-4" /> };
    if (moderate) return { label: 'Fair', colorClass: 'text-yellow-600', icon: <AlertTriangle className="w-4 h-4" /> };
    return { label: 'Needs Attention', colorClass: 'text-red-600', icon: <AlertTriangle className="w-4 h-4" /> };
  };
  
  const scoreStatus = getStatus(currentMetrics.dependencyScore || 0, 80, false); // Score higher is better

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Dependency Health & Security</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <MetricCard
            label="Total Dependencies"
            value={currentMetrics.totalDependencies.toLocaleString()}
            status={getStatus(currentMetrics.totalDependencies, config.rules.maxDependencies, true)}
            details={`Max allowed: ${config.rules.maxDependencies}`}
        />
        <MetricCard
            label="Development Dependencies"
            value={currentMetrics.devDependencies.toLocaleString()}
            status={getStatus(currentMetrics.devDependencies, config.rules.maxDevDependencies, true)}
            details={`Max allowed: ${config.rules.maxDevDependencies}`}
        />
        <MetricCard
            label="Outdated Packages"
            value={currentMetrics.outdatedPackages.toLocaleString()}
            status={getStatus(currentMetrics.outdatedPackages, 5, true)} // Good if < 5, moderate will be calculated internally
            details="Lower is better"
        />
         <MetricCard
            label="Overall Dependency Score"
            value={`${currentMetrics.dependencyScore || 0}%`}
            status={scoreStatus}
            details={`Target: >80%`}
        />

        <div className="md:col-span-2 pt-4 mt-2 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm flex items-center">
                <ShieldCheck className="w-4 h-4 mr-2 text-red-500" /> Vulnerabilities:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                 <VulnerabilityCountItem label="Vulnerable Packages" count={currentMetrics.vulnerablePackages} color="bg-red-500" />
                 <VulnerabilityCountItem label="Critical Issues" count={currentMetrics.criticalVulnerabilities} color="bg-red-700" />
                 <VulnerabilityCountItem label="High Issues" count={currentMetrics.highVulnerabilities} color="bg-orange-500" />
            </div>
        </div>

        <div className="md:col-span-2 pt-4 mt-2 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Configuration & Scans:</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <p><span className="font-medium">Security Scanning:</span> {config.security.enabled ? 'Enabled' : 'Disabled'}</p>
                <p><span className="font-medium">Scan Frequency:</span> {config.security.scanFrequency}</p>
                <p><span className="font-medium">Min Severity Alert:</span> {config.security.minimumSeverity}</p>
                <p><span className="font-medium">Fail on Vulnerability:</span> {config.security.failOnVulnerability ? 'Yes' : 'No'}</p>
                 {currentMetrics.lastScan && (
                    <p className="flex items-center"><Clock className="w-3 h-3 mr-1 text-gray-500" /> <span className="font-medium">Last Scan:</span> {new Date(currentMetrics.lastScan).toLocaleDateString()}</p>
                 )}
            </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{label: string; value: string; status: {label: string; colorClass: string; icon: React.ReactNode}; details: string}> =
({label, value, status, details}) => (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-sm text-gray-700 mb-1">{label}</h3>
        <div className="flex items-baseline justify-between">
            <p className={`text-2xl font-bold ${status.colorClass}`}>{value}</p>
            <div className={`flex items-center text-xs px-1.5 py-0.5 rounded-full ${status.colorClass.replace('text-', 'bg-').replace('-600', '-100')} ${status.colorClass}`}>
                {React.cloneElement(status.icon as React.ReactElement, {className: "w-3 h-3 mr-1"})}
                {status.label}
            </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{details}</p>
    </div>
);

const VulnerabilityCountItem: React.FC<{label: string; count: number; color: string}> = ({label, count, color}) => (
    <div className={`p-2 rounded text-white text-center shadow-sm ${color}`}>
        <div className="font-bold text-sm">{count}</div>
        <div className="text-[0.65rem] leading-tight">{label}</div>
    </div>
);
