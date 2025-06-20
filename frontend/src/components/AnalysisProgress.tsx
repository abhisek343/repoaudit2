import React, { useState, useEffect } from 'react';
import { useEta } from '../hooks/useEta';
import { formatMs } from '../utils/time';

interface Props {
  progress: number;            // 0-100 from BackendAnalysisService
  currentStep: string;         // the step label
}

const AnalysisProgress: React.FC<Props> = ({ progress, currentStep }) => {
  const [localProgress, setLocalProgress] = useState(progress);
  const [smoothProgress, setSmoothProgress] = useState(progress);
  const etaMs = useEta(smoothProgress);

  // Smooth progress updates to prevent jumps
  useEffect(() => {
    setLocalProgress(progress);
    // Gradually update the smooth progress
    const interval = setInterval(() => {
      setSmoothProgress(current => {
        const diff = localProgress - current;
        if (Math.abs(diff) < 0.1) {
          clearInterval(interval);
          return localProgress;
        }
        return current + diff * 0.1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [progress, localProgress]);

  // Ensure progress never decreases
  useEffect(() => {
    if (progress < localProgress) {
      console.warn('Progress decreased from', localProgress, 'to', progress);
      // Keep the higher value
      setLocalProgress(prev => Math.max(prev, progress));
    }
  }, [progress, localProgress]);

  return (
    <div className="analysis-progress space-y-2">
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${smoothProgress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span className="font-medium">{currentStep}</span>
        <div className="flex items-center space-x-4">
          <span>{Math.round(smoothProgress)}%</span>
          <span className="text-gray-400">
            {etaMs != null ? formatMs(etaMs) : 'estimating...'}
          </span>
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400">
          Raw: {progress.toFixed(1)}% | Local: {localProgress.toFixed(1)}% | Smooth: {smoothProgress.toFixed(1)}%
        </div>
      )}
    </div>
  );
};

export default AnalysisProgress;
