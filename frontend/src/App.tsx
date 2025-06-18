import { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import ReportPage from './pages/ReportPage';
import DashboardPage from './pages/DashboardPage';
import APITreePage from './pages/APITreePage';
import { AnalysisService } from './services/analysisService';
import { initializeStorage } from './services/storageService';

function App() {
  const [storageError, setStorageError] = useState<Error | null>(null);

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
    const initializeApp = async () => {
      try {
        // Initialize storage first
        await initializeStorage();
        // Then run the debug function
        await debugAnalysisData();
      } catch (e) {
        console.error('App initialization failed', e);
        setStorageError(e as Error);
      }
    };

    initializeApp();
  }, []);
  const router = createBrowserRouter([
    {
      path: "/",
      element: <ErrorBoundary><HomePage /></ErrorBoundary>,
    },
    {
      path: "/analyze",
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
    {
      path: "/api-tree/:reportId",
      element: <APITreePage />,
    },
  ]);

  if (storageError) {
    console.error('Initialization Error Details:', {
      message: storageError.message,
      name: storageError.name,
      stack: storageError.stack
    });
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold text-red-600">Initialization Error</h1>
          <p className="mt-4">Failed to initialize application storage: {storageError.message}</p>
          <p className="mt-2">Please try refreshing the page. Check the browser console for detailed error information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
