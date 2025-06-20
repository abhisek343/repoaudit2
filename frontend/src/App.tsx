import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnalysisService } from './services/analysisService';
import { initializeStorage } from './services/storageService';

// Lazy-loaded page components
const HomePage = lazy(() => import('./pages/HomePage'));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const APITreePage = lazy(() => import('./pages/APITreePage'));
const FeatureMatrixPage = lazy(() => import('./pages/FeatureMatrixPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Loading spinner component
const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
      <div className="flex items-center justify-center space-x-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-lg font-medium text-gray-700">{message}</p>
      </div>
      <div className="mt-4 bg-gray-200 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
      </div>
    </div>
  </div>
);

// Error display component
const ErrorDisplay = ({ error }: { error: Error }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full mx-4">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.348 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Application Initialization Error</h1>
          <p className="text-gray-700 mb-4">Failed to initialize application storage:</p>
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800 font-medium">{error.message}</p>
          </div>
          <details className="mb-4">
            <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800">
              Technical Details
            </summary>
            <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded border">
              <p><strong>Error Type:</strong> {error.name}</p>
              {error.stack && (
                <div className="mt-2">
                  <strong>Stack Trace:</strong>
                  <pre className="mt-1 text-xs overflow-auto max-h-32">{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
          <div className="flex space-x-3">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button 
              onClick={() => localStorage.clear()} 
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Clear Storage & Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  const [storageError, setStorageError] = useState<Error | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initProgress, setInitProgress] = useState(0);

  // Debug analysis data with enhanced error handling
  const debugAnalysisData = useCallback(async () => {
    try {
      setInitProgress(50);
      const analysisService = new AnalysisService();
      const lastResult = await analysisService.getLastAnalysisResult();
        const debugInfo = {
        hasStoredResult: !!lastResult,
        resultKeys: lastResult ? Object.keys(lastResult) : [],
        basicInfo: lastResult?.basicInfo,
        repositoryUrl: lastResult?.repositoryUrl,
        metrics: lastResult?.metrics,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        storageQuota: 'storage' in navigator ? await navigator.storage.estimate() : null,
      };
      
      setInitProgress(100);
      
      return debugInfo;    } catch (error) {
      console.error("Error in debugAnalysisData:", error);
      throw error;
    }
  }, []);
  // Enhanced initialization with progress tracking
  useEffect(() => {
    let isMounted = true;    const initializeApp = async () => {
      try {
        setInitProgress(10);
        
        // Initialize storage with timeout
        setInitProgress(25);
        await Promise.race([
          initializeStorage(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Storage initialization timeout')), 10000)
          )
        ]);
        
        if (!isMounted) return;
        
        // Debug analysis data
        setInitProgress(50);
        
        if (!isMounted) return;
        
        setInitProgress(100);
        
        // Small delay for smooth UX
        setTimeout(() => {
          if (isMounted) {
            setIsInitializing(false);
          }
        }, 300);
          } catch (error) {
        console.error('App initialization failed:', error);
        if (isMounted) {
          setStorageError(error as Error);
          setIsInitializing(false);
        }
      }
    };

    initializeApp();
    
    return () => {
      isMounted = false;
    };
  }, [debugAnalysisData]);

  // Memoized router configuration with future flags
  const router = useMemo(
    () =>
      createBrowserRouter(
        [
          {
            path: "/",
            element: <ErrorBoundary><HomePage /></ErrorBoundary>,
            errorElement: <ErrorBoundary><div>Homepage Error</div></ErrorBoundary>,
          },
          {
            path: "/analyze",
            element: <ErrorBoundary><AnalyzePage /></ErrorBoundary>,
            errorElement: <ErrorBoundary><div>Analysis Error</div></ErrorBoundary>,
          },
          {
            path: "/dashboard",
            element: <ErrorBoundary><DashboardPage /></ErrorBoundary>,
            errorElement: <ErrorBoundary><div>Dashboard Error</div></ErrorBoundary>,
          },
          {
            path: "/report/:repoId",
            element: <ErrorBoundary><ReportPage /></ErrorBoundary>,
            errorElement: <ErrorBoundary><div>Report Error</div></ErrorBoundary>,
          },
          {
            path: "/api-tree/:reportId",
            element: <ErrorBoundary><APITreePage /></ErrorBoundary>,
            errorElement: <ErrorBoundary><div>API Tree Error</div></ErrorBoundary>,
          },          {
            path: "/feature-matrix/:reportId",
            element: <ErrorBoundary><FeatureMatrixPage /></ErrorBoundary>,
            errorElement: <ErrorBoundary><div>Feature Matrix Error</div></ErrorBoundary>,
          },
          {
            path: "*",
            element: <ErrorBoundary><NotFoundPage /></ErrorBoundary>,
            errorElement: <ErrorBoundary><div>404 Error</div></ErrorBoundary>,
          },
        ],
        {
          future: { 
            v7_startTransition: true,
            v7_relativeSplatPath: true,
            v7_fetcherPersist: true,
            v7_normalizeFormMethod: true,
            v7_partialHydration: true,
            v7_skipActionErrorRevalidation: true,
          }
        }
      ),
    []
  );

  // Enhanced error state
  if (storageError) {
    return <ErrorDisplay error={storageError} />;
  }

  // Enhanced loading state with progress
  if (isInitializing) {
    return <LoadingSpinner message={`Initializing application... ${initProgress}%`} />;
  }
  // Main application with enhanced router
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
        <RouterProvider router={router} />
      </Suspense>
    </div>
  );
}

export default App;
