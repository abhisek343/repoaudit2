import { useEffect } from 'react'; // Removed useState, useLayoutEffect
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import ReportPage from './pages/ReportPage';
import DashboardPage from './pages/DashboardPage';
// import { AnalysisResult } from './types'; // No longer needed here
import { AnalysisService } from './services/analysisService';

function App() {
  const debugAnalysisData = async () => {
    try {
      const analysisService = new AnalysisService();
      const lastResult = await analysisService.getLastAnalysisResult();
      
      console.log('Debug Analysis Data:', {
      hasStoredResult: !!lastResult,
      resultKeys: lastResult ? Object.keys(lastResult) : [],
      basicInfo: lastResult?.basicInfo,
      repositoryUrl: lastResult?.repositoryUrl,
      metrics: lastResult?.metrics
      });
    } catch (e) {
      console.error("Error in debugAnalysisData:", e);
    }
  };

  useEffect(() => {
    debugAnalysisData();
  }, []);

  // Removed state variables: currentAnalysis, isAnalyzing, error, progress, currentStep, eventSource
  // Removed useLayoutEffect for body overflow

  // Removed handler functions: handleAnalysisStart, handleCancelAnalysis, handleErrorClear

  const router = createBrowserRouter([
    {
      path: "/",
      element: <ErrorBoundary><HomePage /></ErrorBoundary>,
    },
    {
      path: "/analyze",
      // AnalyzePage now manages its own state, so no props are passed for analysis lifecycle
      element: <AnalyzePage />, 
    },
    {
      path: "/dashboard",
      element: <DashboardPage />,
    },
    {
      path: "/report/:repoId",
      element: <ReportPage />,
    },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
