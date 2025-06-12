import { useState, useEffect, /* useContext, createContext, ReactNode */ } from 'react'; // Commented out context-related imports
import { AnalysisResult } from '../types';

// interface ReportContextType {
//   reportData: AnalysisResult | null;
//   isLoading: boolean;
//   error: string | null;
//   setReportData: (data: AnalysisResult | null) => void;
//   setLoading: (loading: boolean) => void;
//   setError: (error: string | null) => void;
//   refreshReport: () => Promise<void>;
// }

// const ReportContext = createContext<ReportContextType | undefined>(undefined);

// export const ReportProvider = ({ children }: { children: ReactNode }) => {
//   const [reportData, setReportData] = useState<AnalysisResult | null>(null);
//   const [isLoading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const refreshReport = async () => {
//     try {
//       setLoading(true);
//       setError(null);
      
//       const currentRepo = localStorage.getItem('currentRepository');
//       if (!currentRepo) {
//         throw new Error('No repository selected for analysis');
//       }

//       const response = await fetch(`/api/analyze?repoUrl=${encodeURIComponent(currentRepo)}`, { 
//         method: 'GET',
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({ message: response.statusText }));
//         throw new Error(`Analysis failed: ${errorData.message || response.statusText}`);
//       }
//       // This needs to be adapted for SSE if the endpoint is strictly SSE
//       const data = await response.json(); 
//       setReportData(data);
//     } catch (err) {
//       const errorMessage = err instanceof Error ? err.message : 'Failed to refresh report';
//       setError(errorMessage);
//       console.error('Report refresh error:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const value: ReportContextType = {
//     reportData,
//     isLoading,
//     error,
//     setReportData,
//     setLoading,
//     setError,
//     refreshReport,
//   };

//   return (
//     <ReportContext.Provider value={value}>
//       {children}
//     </ReportContext.Provider>
//   );
// };

// export const useReport = (): ReportContextType => {
//   const context = useContext(ReportContext);
//   if (context === undefined) {
//     throw new Error('useReport must be used within a ReportProvider');
//   }
//   return context;
// };

export const useReportSimple = () => {
  const [reportData, setReportData] = useState<AnalysisResult | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  const cachedData = localStorage.getItem('reportData');
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      setReportData(parsed);
      return; // Don't fetch if we have cached data
    } catch (err) {
      console.error('Failed to parse cached report data:', err);
      localStorage.removeItem('reportData'); // Clear corrupt data
    }
  }
  
  const currentRepo = localStorage.getItem('currentRepository');
  if (currentRepo) {
    setLoading(true);
    setError(null);
    
    const eventSource = new EventSource(`/api/analyze?repoUrl=${encodeURIComponent(currentRepo)}`);
    
    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        if (parsedData.step && typeof parsedData.progress === 'number') {
          console.log(`SSE Progress: ${parsedData.step} - ${parsedData.progress}%`);
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.addEventListener('complete', (event: MessageEvent) => {
      try {
        const completeData = JSON.parse(event.data);
        console.log('Received complete data:', completeData); // Debug log
        
        // Ensure we have all required fields
        const processedData = ensureCompleteData(completeData);
        
        setReportData(processedData);
        localStorage.setItem('reportData', JSON.stringify(processedData));
        setError(null);
      } catch (e) {
        console.error("Failed to parse complete event data:", e);
        setError("Received malformed completion data from server.");
      } finally {
        setLoading(false);
        eventSource.close();
      }
    });

    // General onerror for network issues etc.
    eventSource.onerror = (err) => {
        if (eventSource.readyState === EventSource.CLOSED) {
             // This might be a normal closure after an error event, or client navigating away
            console.log("EventSource closed.");
        } else {
            console.error("EventSource failed (general onerror):", err);
            setError("Failed to connect to analysis stream (network/config issue).");
            setLoading(false);
            eventSource.close();
        }
    };
    
    return () => {
        eventSource.close();
    };
  } else if (!currentRepo) {
      setError("No repository is currently selected for analysis.");
      setLoading(false);
  }
}, []);

// Helper function to ensure complete data structure
function ensureCompleteData(data: Partial<AnalysisResult>): AnalysisResult {
  return {
    id: data.id || `${Date.now()}`,
    repositoryUrl: data.repositoryUrl || '',
    createdAt: data.createdAt || new Date().toISOString(),
    
    basicInfo: data.basicInfo || { name: '', fullName: '', description: '', stars: 0, forks: 0, watchers: 0, language: '', url: '', owner: '', createdAt: '', updatedAt: '', defaultBranch: '', size: 0, openIssues: 0, hasWiki: false, hasPages: false },
    repository: data.repository || data.basicInfo as any || { name: '', fullName: '', description: '', language: '', stars: 0, forks: 0, watchers: 0, createdAt: '', updatedAt: '', defaultBranch: '', size: 0, openIssues: 0, hasWiki: false, hasPages: false },
    commits: data.commits || [],
    contributors: data.contributors || [],
    files: data.files || [],
    languages: data.languages || {},
    dependencies: data.dependencies || { dependencies: {}, devDependencies: {} },
    dependencyGraph: data.dependencyGraph || { nodes: [], links: [] },
    qualityMetrics: data.qualityMetrics || {},
    securityIssues: data.securityIssues || [],
    technicalDebt: data.technicalDebt || [],
    performanceMetrics: data.performanceMetrics || [],
    hotspots: data.hotspots || [],
    keyFunctions: data.keyFunctions || [],
    apiEndpoints: data.apiEndpoints || [],
    metrics: data.metrics || {
      totalCommits: data.commits?.length || 0,
      totalContributors: data.contributors?.length || 0,
      linesOfCode: 0, codeQuality: 0, testCoverage: 0, busFactor: 0,
      securityScore: 0, technicalDebtScore: 0, performanceScore: 0,
      criticalVulnerabilities: 0, highVulnerabilities: 0, mediumVulnerabilities: 0, lowVulnerabilities: 0
    },
    
    // Preserve other fields
    ...data
  };
}

  const refreshReport = async () => {
    localStorage.removeItem('reportData');
    setReportData(null);
    // The useEffect will re-run due to reportData becoming null,
    // and if currentRepo exists, it will re-initiate the EventSource connection.
    // This is a simple way to trigger a refresh.
    // A more direct re-initiation of EventSource could also be done here.
    console.log("refreshReport called, cache cleared, useEffect will re-initiate SSE.");
    // Force re-render or re-check in useEffect, one way is to temporarily set loading
    setLoading(true); 
    // A slight delay can help ensure state changes propagate if useEffect depends on them
    setTimeout(() => setLoading(false), 50); 
  };

  return {
    reportData,
    isLoading,
    error,
    setReportData,
    setLoading,
    setError,
    refreshReport,
  };
};
