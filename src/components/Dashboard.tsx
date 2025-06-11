import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { persistReport } from '../utils/persist';
import { CodeQualityMetricsDisplay } from './CodeQualityMetrics';
import { SecurityMetricsDisplay } from './SecurityMetrics';
import { DependencyMetricsDisplay } from './DependencyMetrics';
import { defaultSecurityConfig } from '../config/security.config';
import { defaultDependencyConfig } from '../config/dependencies.config';
import { AnalysisResult, SecurityIssue, Repository, Contributor, Commit, FileInfo } from '../types';

export const Dashboard: React.FC = () => {
  const [codeMetrics] = useState({
    averageComplexity: 0,
    testCoveragePercentage: 0,
    duplicationPercentage: 0,
    maintainabilityIndex: 0,
    issuesCount: {
      blocker: 0,
      critical: 0,
      major: 0,
      minor: 0,
      info: 0,
    }
  });
  
  const [simulatedSecurityData] = useState<{
    securityScore: number;
    securityIssues: SecurityIssue[];
    activeConnections: number;
    blockedRequests: number;
    totalRequests: number;
    averageResponseTime: number;
    lastSecurityScan: Date;
  }>({
    securityScore: 0,
    securityIssues: [],
    activeConnections: 0, 
    blockedRequests: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    lastSecurityScan: new Date()
  });
  
  const [dependencyMetrics] = useState({
    totalDependencies: 0,
    devDependencies: 0,
    outdatedPackages: 0,
    vulnerablePackages: 0,
    criticalVulnerabilities: 0,
    highVulnerabilities: 0,
    lastScan: new Date().toISOString(),
    dependencyScore: 0
  });

  const saveAnalysis = async (report: Partial<AnalysisResult>) => {
    const key = `report_${Date.now()}`;
    try {
      await persistReport(key, report);
    } catch (err) {
      console.error('Could not persist report', err);
      toast.error('Failed to save the report; it will be available for this session only.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-800">Project Metrics Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time monitoring of code quality, security, and dependency metrics</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <CodeQualityMetricsDisplay metrics={codeMetrics} />
          </div>
          <div>
            <SecurityMetricsDisplay 
              config={defaultSecurityConfig}
              reportData={
                {
                  metrics: {
                    securityScore: simulatedSecurityData.securityScore,
                    codeQuality: 0,
                    testCoverage: 0,
                    busFactor: 0,
                    linesOfCode: 0,
                    totalCommits: 0,
                    totalContributors: 0,
                    technicalDebtScore: 0,
                    performanceScore: 0,
                    criticalVulnerabilities: 0,
                    highVulnerabilities: 0,
                    mediumVulnerabilities: 0,
                    lowVulnerabilities: 0,
                  },
                  securityIssues: simulatedSecurityData.securityIssues,
                  repository: {} as Repository,
                  contributors: [] as Contributor[],
                  commits: [] as Commit[],
                  files: [] as FileInfo[],
                  languages: {},
                  aiSummary: '',
                  hotspots: [],
                  keyFunctions: [],
                  securityAnalysis: '',
                  technicalDebt: [],
                  apiEndpoints: [],
                  performanceMetrics: [],
                  codeQualityMetrics: undefined,
                } as unknown as AnalysisResult
              }
            />
          </div>
          <div className="lg:col-span-2">
            <DependencyMetricsDisplay
              config={defaultDependencyConfig}
              currentMetrics={dependencyMetrics}
            />
          </div>
        </div>

        <footer className="bg-white p-4 rounded-lg shadow-md text-center text-gray-600">
          <p>Last updated: {new Date().toLocaleString()}</p>
        </footer>
      </div>
    </div>
  );
};
