import React from 'react';
import { useEta } from '../hooks/useEta';
import { formatMs } from '../utils/time';

interface Props {
  progress: number;            // 0-100 from BackendAnalysisService
  currentStep: string;         // the step label
}

const AnalysisProgress: React.FC<Props> = ({ progress, currentStep }) => {
  const etaMs = useEta(progress);

  return (
    <div className="analysis-progress">
      <div className="bar">
        <div
          className="bar__fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="bar__info">
        <span>{currentStep}</span>
        <span>{progress}%</span>
        <span>
          {etaMs != null ? formatMs(etaMs) : 'estimating…'}
        </span>
      </div>
    </div>
  );
};

export default AnalysisProgress;
