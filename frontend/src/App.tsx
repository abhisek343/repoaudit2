import { useState, useLayoutEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import ReportPage from './pages/ReportPage';
import DashboardPage from './pages/DashboardPage';
import { AnalysisResult } from './types';
import { AnalysisService } from './services/analysisService';

function App() {
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  // Debug function on mount to check stored analysis results
  useLayoutEffect(() => {
    const debugOnMount = async () => {
      const analysisService = new AnalysisService();
      const lastResult = await analysisService.getLastAnalysisResult();
      
      console.log('Debug Analysis Data on Mount:', {
        hasStoredResult: !!lastResult,
        resultKeys: lastResult ? Object.keys(lastResult) : [],
        basicInfo: lastResult?.basicInfo,
        repositoryUrl: lastResult?.repositoryUrl,
        metrics: lastResult?.metrics
      });
    };
    debugOnMount();
  }, []);

  useLayoutEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const isModalOpen = isAnalyzing || !!error;

    if (isModalOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isAnalyzing, error]);

  const handleAnalysisStart = (
    repoUrl: string,
    // Update the type of navigate to accept an options argument
    navigate: (
      path: string,
      options?: {
        replace?: boolean;
        state?: { analysisResultFromNavigation?: AnalysisResult };
      }
    ) => void
  ) => {
    setIsAnalyzing(true);
    setError(undefined);
    setProgress(0);
    setCurrentStep('Initializing analysis...');
    
    const savedToken = localStorage.getItem('githubToken');
    const analysisService = new AnalysisService(savedToken || undefined);
    
    const { eventSource: newEventSource, analysisPromise } = analysisService.analyzeRepository(
      repoUrl,
      (step: string, progressValue: number) => {
        setCurrentStep(step);
        setProgress(progressValue);
      }
    );

    setEventSource(newEventSource);    analysisPromise
      .then((result) => {
        console.log('Analysis completed successfully:', result);
        setCurrentAnalysis(result);
        setIsAnalyzing(false);
        // Pass result via router state to ensure ReportPage has it immediately
        navigate(`/report/${result.id}`, { 
          replace: true,
          state: { analysisResultFromNavigation: result } 
        });
      })
      .catch((err) => {
        console.error('Analysis failed:', err);
        setError(err.message);
        setIsAnalyzing(false);
      });
  };

  const handleCancelAnalysis = () => {
    if (eventSource) {
      eventSource.close();
    }
    setIsAnalyzing(false);
    setError('Analysis cancelled by user.');
  };

  const handleErrorClear = () => {
    setError(undefined);
  };  const router = createBrowserRouter([
    {
      path: "/",
      element: <ErrorBoundary><HomePage /></ErrorBoundary>,
    },
    {
      path: "/analyze",
      element: (
        <AnalyzePage 
          // Pass router.navigate directly
          onAnalysisStart={(repoUrl: string) => handleAnalysisStart(repoUrl, router.navigate)} 
          isAnalyzing={isAnalyzing} 
          error={error} 
          progress={progress} 
          currentStep={currentStep} 
          onCancel={handleCancelAnalysis} 
          onErrorClear={handleErrorClear} 
        />
      ),
    },
    {
      path: "/dashboard",
      element: <DashboardPage />,
    },    {
      path: "/report/:repoId",
      element: <ReportPage key={currentAnalysis?.id || 'no-analysis'} analysisResult={currentAnalysis} />,
    },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
