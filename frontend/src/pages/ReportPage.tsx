import React, { useState, useEffect } from 'react';
// Add useLocation
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'; 
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  AlertTriangle,
  Star,
  GitFork,
  Download,
  Share2,
  Code,
  Activity,
  GitCommit,
  BookOpen,
  BarChart3,
  Layers,
  Github,
  Loader2 // For loading spinner
} from 'lucide-react';

import OverviewPage from '../components/report/OverviewPage';
import ArchitecturePage from '../components/report/ArchitecturePage';
import ActivityPage from '../components/report/ActivityPage';
import CommunityPage from '../components/report/CommunityPage';
import OnboardingPage from '../components/report/OnboardingPage';
import DiagramsPage from '../components/report/DiagramsPage';
import GitHistoryPage from './GitHistoryPage';
import { AnalysisResult } from '../types';
import { StorageService } from '../services/storageService';
import VisualizationErrorBoundary from '../components/VisualizationErrorBoundary';

interface ReportPageProps {
  analysisResult?: AnalysisResult | null;
}

const ReportPage = ({ analysisResult }: ReportPageProps) => {
  const { repoId } = useParams<{ repoId: string }>();
  console.log('[ReportPage] repoId from params:', repoId); // Log repoId
  const [reportData, setReportData] = useState<AnalysisResult | null | undefined>(analysisResult);
  const [isLoading, setIsLoading] = useState<boolean>(!analysisResult);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();
  const location = useLocation(); // Get location object
  
  // Attempt to get analysisResult from navigation state first
  const analysisResultFromNavigation = location.state?.analysisResultFromNavigation as AnalysisResult | undefined;

  useEffect(() => {
    console.log('[ReportPage] useEffect triggered. analysisResultFromNavigation:', analysisResultFromNavigation, 'analysisResult prop:', analysisResult, 'repoId:', repoId);
    const loadReport = async () => {
      // Reset error and loading state at the beginning of any load attempt
      setError(null); 
      setIsLoading(true);

      if (analysisResultFromNavigation) {
        console.log('[ReportPage] Using analysisResult from navigation state:', analysisResultFromNavigation);
        // Ensure the URL matches the ID of the navigated report
        if (repoId && analysisResultFromNavigation.id !== repoId) {
          console.warn(`[ReportPage] URL repoId (${repoId}) mismatches navigated report ID (${analysisResultFromNavigation.id}). Navigating to correct URL.`);
          // Navigate to the correct URL for the freshly analyzed report
          // This will also cause this useEffect to re-run with the new repoId
          navigate(`/report/${analysisResultFromNavigation.id}`, { replace: true, state: { analysisResultFromNavigation } });
          // setIsLoading(false); // Don't set loading to false yet, let the re-run handle it.
          return; // Exit early, the navigation will trigger a new load sequence
        }
        setReportData(analysisResultFromNavigation);
        setIsLoading(false);
      } else if (analysisResult) { // Fallback to prop if navigation state is not available
        console.log('[ReportPage] Using analysisResult prop:', analysisResult);
        setReportData(analysisResult);
        setIsLoading(false);
      } else if (repoId && repoId.trim() !== "") { // Fallback to loading from storage by ID, ensure repoId is valid
        console.log(`[ReportPage] No direct data, attempting to load ID: ${repoId} from StorageService.`);
        // setIsLoading(true); // Already set above
        try {
          const storedResult = await StorageService.getAnalysisResultById(repoId);
          console.log('[ReportPage] Result from StorageService.getAnalysisResultById:', storedResult);
          if (storedResult) {
            setReportData(storedResult);
          } else {
            console.error(`[ReportPage] No data found in StorageService for ID: ${repoId}`);
            setError("Report data not found. Please try analyzing again.");
          }
        } catch (err) {
          console.error('[ReportPage] Error loading from StorageService:', err);
          setError("Failed to load report data. Please try again.");
        } finally {
          setIsLoading(false);
        }
      } else { // Added else to handle missing repoId when other sources fail
        console.error('[ReportPage] repoId is missing or invalid, and no data from props or navigation state.');
        setError("Invalid report identifier or data not available. Cannot load report.");
        setIsLoading(false);
      }
    };
    loadReport();
  }, [analysisResultFromNavigation, analysisResult, repoId, navigate]); // Added navigate

  // Add a new useEffect to log reportData changes
  useEffect(() => {
    console.log('[ReportPage] reportData state changed:', reportData);
    if (reportData) {
      console.log('[ReportPage] reportData.id:', reportData.id);
      console.log('[ReportPage] reportData.repositoryUrl:', reportData.repositoryUrl);
    }
  }, [reportData]);

  const pages = [
    { id: 'overview', title: 'Overview & Vitals', icon: <BarChart3 className="w-5 h-5" />, component: OverviewPage },
    { id: 'architecture', title: 'Code Architecture & Quality', icon: <Code className="w-5 h-5" />, component: ArchitecturePage },
    { id: 'diagrams', title: 'Advanced Diagrams', icon: <Layers className="w-5 h-5" />, component: DiagramsPage },
    { id: 'activity', title: 'Activity & Momentum', icon: <Activity className="w-5 h-5" />, component: ActivityPage },
    { id: 'community', title: 'Community & Contributors', icon: <Users className="w-5 h-5" />, component: CommunityPage },
    { id: 'onboarding', title: 'Onboarding & Contribution Guide', icon: <BookOpen className="w-5 h-5" />, component: OnboardingPage },
    { id: 'git-history', title: 'Git History', icon: <GitCommit className="w-5 h-5" />, component: GitHistoryPage }
  ];


  const handleExportReport = () => {
    if (!reportData) return;
    
    const exportData = {
      ...reportData,
      reportGeneratedAtClient: new Date().toISOString(), // Distinguish from potential backend generation time
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(reportData.basicInfo.fullName as string).replace(/[^a-z0-9]/gi, '_').toLowerCase()}_audit_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareReport = async () => {
    if (!reportData) return;
    
    const shareData = {
      title: `Repo Auditor Report: ${reportData.basicInfo.fullName}`,
      text: `Check out this comprehensive audit report for ${reportData.basicInfo.fullName} generated by Repo Auditor.`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing report:', error);
        // Fallback for when navigator.share fails (e.g., user cancels)
        alert('Sharing cancelled or failed. You can copy the URL from your browser.');
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Report URL copied to clipboard!'))
        .catch(err => {
            console.error('Failed to copy URL: ', err);
            alert('Failed to copy URL. Please copy it manually from your browser.');
        });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-700">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-xl shadow-xl max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Report</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/analyze')} 
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
          >
            Analyze a New Repository
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    console.log('[ReportPage] Rendering null because reportData is null/undefined and not loading/error.');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-lg text-slate-700">Preparing report...</p>
        <p className="text-sm text-slate-500 mt-2">If this takes too long, please ensure you have a valid report ID or try re-analyzing.</p>
        <Link to="/analyze" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Analyze a New Repository
        </Link>
      </div>
    );
  }

  // console.log('[ReportPage] Rendering actual report content with data:', reportData);
  const CurrentPageComponent = pages[currentPage]?.component;

  if (!CurrentPageComponent) {
    // This can happen if currentPage is out of bounds, though it shouldn't with current logic.
    // It's a good safeguard.
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-xl shadow-xl max-w-md">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Page</h2>
          <p className="text-gray-600 mb-6">The selected page does not exist.</p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100">
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 w-full z-50 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link 
                to="/dashboard" 
                className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </Link>
              <div className="flex items-center space-x-2">
                 <Github className="w-6 h-6 text-indigo-600"/>
                <h1 className="text-xl font-bold text-gray-900 truncate" title={reportData.basicInfo.fullName}>
                  {reportData.basicInfo.fullName}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-3 text-sm text-gray-600">
                <div className="flex items-center space-x-1" title="Stars">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{reportData.basicInfo.stars?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-1" title="Forks">
                  <GitFork className="w-4 h-4 text-blue-500" />
                  <span>{reportData.basicInfo.forks?.toLocaleString() || 'N/A'}</span>
                </div>
                 <div className="flex items-center space-x-1" title="Last Updated">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{reportData.basicInfo.updatedAt ? new Date(reportData.basicInfo.updatedAt as string).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
              
              <button
                onClick={handleShareReport}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors duration-200"
                title="Share Report"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleExportReport}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors duration-200"
                title="Export Report as JSON"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-[65px] w-full z-40 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-4 overflow-x-auto no-scrollbar">
            {pages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => setCurrentPage(index)}
                className={`flex items-center space-x-2 py-3 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 focus:outline-none ${
                  currentPage === index
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {React.cloneElement(page.icon, { className: `w-4 h-4 sm:w-5 sm:h-5 ${currentPage === index ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}` })}
                <span className="hidden sm:inline">{page.title}</span>
                <span className="sm:hidden">{page.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* New wrapper div for main content and footer */}
      <div className="pt-[150px]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <VisualizationErrorBoundary>
            <CurrentPageComponent analysisResult={reportData} reportData={reportData} />
          </VisualizationErrorBoundary>
        </main>

        <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200 sticky bottom-0 z-10 py-3">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-1.5">
                {pages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 focus:outline-none ${
                      currentPage === index ? 'bg-indigo-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
                disabled={currentPage === pages.length - 1}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              >
                <span>Next</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </footer>
      </div> {/* Closing tag for the new wrapper div */}
    </div>
  );
};

export default ReportPage;
