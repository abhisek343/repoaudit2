import React, { useState, useEffect } from 'react';
import { CodeQualityMetricsDisplay } from './CodeQualityMetrics';
import { SecurityMetricsDisplay } from './SecurityMetrics';
import { DependencyMetricsDisplay } from './DependencyMetrics';
import { defaultSecurityConfig } from '../config/security.config';
import { defaultDependencyConfig } from '../config/dependencies.config';
import { calculateCodeQualityMetrics } from '../config/quality';

export const Dashboard: React.FC = () => {
  const [codeMetrics, setCodeMetrics] = useState({
    cyclomaticComplexity: 0,
    fileLength: 0,
    functionLengths: [] as number[],
    testCoverage: 0,
    dependencyCount: 0
  });

  const [securityMetrics, setSecurityMetrics] = useState({
    activeConnections: 0,
    blockedRequests: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    lastSecurityScan: new Date()
  });

  const [dependencyMetrics, setDependencyMetrics] = useState({
    totalDependencies: 0,
    devDependencies: 0,
    outdatedPackages: 0,
    vulnerablePackages: 0,
    lastScan: new Date(),
    dependencyScore: 0
  });

  // Simulate metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update security metrics
      setSecurityMetrics(prev => ({
        ...prev,
        activeConnections: Math.floor(Math.random() * 50),
        blockedRequests: Math.floor(Math.random() * 10),
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 5),
        averageResponseTime: Math.floor(Math.random() * 200),
        lastSecurityScan: new Date()
      }));

      // Update code metrics (simulated)
      setCodeMetrics(prev => ({
        ...prev,
        cyclomaticComplexity: Math.floor(Math.random() * 15),
        fileLength: Math.floor(Math.random() * 600),
        functionLengths: Array.from({ length: 3 }, () => Math.floor(Math.random() * 60)),
        testCoverage: Math.floor(Math.random() * 100),
        dependencyCount: Math.floor(Math.random() * 25)
      }));

      // Update dependency metrics (simulated)
      setDependencyMetrics(prev => ({
        ...prev,
        totalDependencies: Math.floor(Math.random() * 100),
        devDependencies: Math.floor(Math.random() * 50),
        outdatedPackages: Math.floor(Math.random() * 10),
        vulnerablePackages: Math.floor(Math.random() * 5),
        lastScan: new Date(),
        dependencyScore: Math.floor(Math.random() * 100)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
              currentMetrics={securityMetrics}
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