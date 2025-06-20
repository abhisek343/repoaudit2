import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { StorageService } from '../services/storageService';

interface DataFlowDebuggerProps {
  currentData?: AnalysisResult | null;
  dataSource: 'prop' | 'navigation' | 'storage' | 'none';
}

export const DataFlowDebugger: React.FC<DataFlowDebuggerProps> = ({ 
  currentData, 
  dataSource 
}) => {
  const [storageResults, setStorageResults] = useState<AnalysisResult[]>([]);
  const [debugInfo, setDebugInfo] = useState<{
    storageCount?: number;
    latestResultId?: string;
    currentDataId?: string;
    dataSource?: string;
    timestamp?: string;
    storageSupported?: boolean;
    indexedDBSupported?: boolean;
    error?: string;
  }>({});

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        const allResults = await StorageService.getAllResults();
        const latestResult = await StorageService.getLatestAnalysisResult();
        
        setStorageResults(allResults);
        setDebugInfo({
          storageCount: allResults.length,
          latestResultId: latestResult?.id,
          currentDataId: currentData?.id,
          dataSource,
          timestamp: new Date().toISOString(),
          storageSupported: 'storage' in navigator,
          indexedDBSupported: 'indexedDB' in window,
        });
      } catch (error) {
        console.error('Debug info loading failed:', error);
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    };

    loadDebugInfo();
  }, [currentData, dataSource]);

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-md">
        <h4 className="font-bold mb-2">Data Flow Debug</h4>
        <div className="space-y-1">
          <div>Source: <span className="text-yellow-300">{dataSource}</span></div>
          <div>Current Data ID: <span className="text-blue-300">{currentData?.id || 'none'}</span></div>
          <div>Storage Count: <span className="text-green-300">{debugInfo.storageCount || 0}</span></div>
          <div>Latest in Storage: <span className="text-purple-300">{debugInfo.latestResultId || 'none'}</span></div>
          {debugInfo.error && (
            <div className="text-red-300">Error: {debugInfo.error}</div>
          )}
          {storageResults.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold">Stored Results:</div>
              {storageResults.slice(0, 3).map((result, i) => (
                <div key={i} className="text-xs">
                  {i + 1}. {result.id} - {result.basicInfo?.fullName || 'Unknown'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default DataFlowDebugger;
