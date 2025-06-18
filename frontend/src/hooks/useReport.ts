import { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { loadReport } from '../utils/persist';

export const useReport = (repoId?: string) => {
  const [reportData, setReportData] = useState<AnalysisResult | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!repoId) {
        setError("No report ID provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const report = await loadReport('lastAnalysisResult');
        if (report) {
          setReportData(report);
        } else {
          setError('Failed to load report data. It might not exist or is corrupted.');
        }
      } catch (e) {
        console.error('Failed to load report:', e);
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [repoId]);

  return { reportData, isLoading, error };
};
