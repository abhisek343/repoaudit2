import { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { loadReport } from '../utils/persist';

export const useReport = (repoId?: string) => {
  const [reportData, setReportData] = useState<AnalysisResult | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchReport = async () => {
      if (!repoId) {
        if (isMounted) {
          setError("No report ID provided.");
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        const report = await loadReport('lastAnalysisResult');
        if (isMounted) {
          if (report) {
            setReportData(report);
          } else {
            setError('Failed to load report data. It might not exist or is corrupted.');
          }
        }
      } catch (e) {
        console.error('Failed to load report:', e);
        if (isMounted) {
          setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      isMounted = false;
    };
  }, [repoId]);

  return { reportData, isLoading, error };
};
