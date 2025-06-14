import React from 'react';
import { SecurityConfig } from '../config/security.config';
// We'll derive metrics from AnalysisResult, not pass currentMetrics directly
import { AnalysisResult } from '../types'; 
import { ShieldAlert, Server, Lock, FileWarning } from 'lucide-react'; // Removed ShieldCheck, Clock, ListChecks
import VisualizationErrorBoundary from './VisualizationErrorBoundary';

interface SecurityMetricsProps {
  config: SecurityConfig; // Default config for display of rules
  reportData: Pick<AnalysisResult, 'securityIssues' | 'metrics'>; // Pass necessary parts of reportData
}

export const SecurityMetricsDisplay: React.FC<SecurityMetricsProps> = ({ config, reportData }) => {
  const securityIssues = reportData.securityIssues || [];

  const criticalIssues = securityIssues.filter(issue => issue.severity === 'critical').length;
  const highIssues = securityIssues.filter(issue => issue.severity === 'high').length;
  const mediumIssues = securityIssues.filter(issue => issue.severity === 'medium').length;
  const lowIssues = securityIssues.filter(issue => issue.severity === 'low').length;
  
  // Derive a simple security score: lower is better, scale 0-10
  const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues;
  const securityScore = totalIssues > 0 ? Math.max(0, 10 - totalIssues) : 10;

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };
  const scoreColor = getScoreColor(securityScore);


  return (
    <VisualizationErrorBoundary>
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
        <ShieldAlert className="w-6 h-6 mr-3 text-red-500" />
        Security Posture
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Overall Security Score</h3>
            <div className="flex items-center">
                <p className={`text-4xl font-bold ${scoreColor}`}>{securityScore.toFixed(1)}</p>
                <span className={`text-sm ml-1 ${scoreColor}`}>/ 10</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Based on identified issues and configuration.</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Identified Issues</h3>
           <div className="space-y-1 text-xs">
                <IssuePill count={criticalIssues} label="Critical" color="bg-red-600" />
                <IssuePill count={highIssues} label="High" color="bg-orange-500" />
                <IssuePill count={mediumIssues} label="Medium" color="bg-yellow-500" />
                <IssuePill count={lowIssues} label="Low" color="bg-blue-500" />
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <ConfigSection title="Rate Limiting (Default Config)" icon={<Server className="w-4 h-4 text-indigo-500"/>}>
          <ConfigItem label="Max Requests" value={`${config.rateLimit.max} / ${config.rateLimit.windowMs / 60000} min`} />
        </ConfigSection>

        <ConfigSection title="File Upload Security (Default Config)" icon={<FileWarning className="w-4 h-4 text-indigo-500"/>}>
          <ConfigItem label="Max File Size" value={`${(config.fileUpload.maxSize / (1024 * 1024)).toFixed(1)} MB`} />
          <ConfigItem label="Allowed Types" value={config.fileUpload.allowedTypes.join(', ')} truncate />
        </ConfigSection>

        <ConfigSection title="Password Policy (Default Config)" icon={<Lock className="w-4 h-4 text-indigo-500"/>}>
          <ConfigItem label="Min Length" value={config.password.minLength.toString()} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
            {config.password.requireUppercase && <span>Uppercase</span>}
            {config.password.requireLowercase && <span>Lowercase</span>}
            {config.password.requireNumbers && <span>Numbers</span>}
            {config.password.requireSpecialChars && <span>Special Chars</span>}
          </div>
        </ConfigSection>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p>Displayed configurations are defaults. Actual runtime security depends on implementation.</p>
      </div>
    </div>
    </VisualizationErrorBoundary>
  );
};

const ConfigSection: React.FC<{title: string; icon: React.ReactNode; children: React.ReactNode}> = ({title, icon, children}) => (
    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
        <h4 className="font-medium text-xs text-indigo-700 mb-2 flex items-center">
            {icon} <span className="ml-1.5">{title}</span>
        </h4>
        <div className="space-y-1">{children}</div>
    </div>
);

const ConfigItem: React.FC<{label: string; value: string; truncate?: boolean}> = ({label, value, truncate}) => (
    <div className="flex justify-between items-center text-xs">
        <span className="text-gray-600">{label}:</span>
        <span className={`font-medium text-gray-800 ${truncate ? 'truncate max-w-[50%]' : ''}`} title={truncate ? value : undefined}>{value}</span>
    </div>
);

const IssuePill: React.FC<{count:number; label:string; color:string}> = ({count, label, color}) => (
    <div className="flex justify-between items-center">
        <span className="text-gray-600">{label}:</span>
        <span className={`px-2 py-0.5 text-white rounded-full text-[0.65rem] font-semibold ${color}`}>{count}</span>
    </div>
);
