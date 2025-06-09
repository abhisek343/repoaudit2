import React from 'react';
import { SecurityConfig } from '../config/security';
import { defaultSecurityConfig } from '../config/security';

interface SecurityMetricsProps {
  config: SecurityConfig;
  currentMetrics: {
    activeConnections: number;
    blockedRequests: number;
    totalRequests: number;
    averageResponseTime: number;
    lastSecurityScan: Date;
  };
}

export const SecurityMetricsDisplay: React.FC<SecurityMetricsProps> = ({ config, currentMetrics }) => {
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
      <h2 className="text-xl font-bold mb-4">Security Metrics</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Rate Limiting</h3>
          <p className={getStatusColor(currentMetrics.activeConnections, config.rateLimit, true)}>
            Active Connections: {currentMetrics.activeConnections} / {config.rateLimit}
          </p>
          <p className="text-sm text-gray-600">
            Blocked Requests: {currentMetrics.blockedRequests}
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Request Statistics</h3>
          <p>Total Requests: {currentMetrics.totalRequests}</p>
          <p>Average Response Time: {currentMetrics.averageResponseTime}ms</p>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">File Upload Security</h3>
          <p>Max File Size: {(config.maxFileSize / (1024 * 1024)).toFixed(2)} MB</p>
          <p>Allowed Types: {config.allowedFileTypes.join(', ')}</p>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">Session Security</h3>
          <p>Session Timeout: {config.sessionTimeout / (60 * 1000)} minutes</p>
          <p>Last Security Scan: {formatDate(currentMetrics.lastSecurityScan)}</p>
        </div>

        <div className="p-3 bg-gray-50 rounded col-span-2">
          <h3 className="font-semibold">CORS Configuration</h3>
          <p>Allowed Origins:</p>
          <ul className="list-disc list-inside text-sm text-gray-600">
            {config.corsOrigins.map((origin: string, index: number) => (
              <li key={index}>{origin}</li>
            ))}
          </ul>
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