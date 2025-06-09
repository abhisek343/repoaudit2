import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Star,
  Eye,
  GitFork,
  Download,
  Share2,
  Shield,
  Code,
  Brain,
  Activity,
  GitCommit,
  BookOpen,
  BarChart3,
  FileText,
  Settings,
  Layers
} from 'lucide-react';

// Import page components
import OverviewPage from '../components/report/OverviewPage';
import ArchitecturePage from '../components/report/ArchitecturePage';
import ActivityPage from '../components/report/ActivityPage';
import CommunityPage from '../components/report/CommunityPage';
import OnboardingPage from '../components/report/OnboardingPage';
import DiagramsPage from '../components/report/DiagramsPage';

import { AnalysisResult } from '../types';

const ReportPage = () => {
  const { repoId } = useParams();
  const [reportData, setReportData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    { id: 'overview', title: 'Overview & Vitals', icon: <BarChart3 className="w-5 h-5" />, component: OverviewPage },
    { id: 'architecture', title: 'Code Architecture & Quality', icon: <Code className="w-5 h-5" />, component: ArchitecturePage },
    { id: 'diagrams', title: 'Advanced Diagrams', icon: <Layers className="w-5 h-5" />, component: DiagramsPage },
    { id: 'activity', title: 'Activity & Momentum', icon: <Activity className="w-5 h-5" />, component: ActivityPage },
    { id: 'community', title: 'Community & Contributors', icon: <Users className="w-5 h-5" />, component: CommunityPage },
    { id: 'onboarding', title: 'Onboarding & Contribution Guide', icon: <BookOpen className="w-5 h-5" />, component: OnboardingPage }
  ];

  useEffect(() => {
    // Load report data from localStorage
    if (repoId) {
      const savedReport = localStorage.getItem(`report_${repoId}`);
      if (savedReport) {
        try {
          const data = JSON.parse(savedReport);
          // Ensure all required fields are present with default values
          const defaultData = {
            metrics: {
              codeQuality: 0,
              testCoverage: 0,
              technicalDebtScore: 0,
              performanceScore: 0,
              totalCommits: 0,
              totalContributors: 0,
              linesOfCode: 0,
              busFactor: 0
            },
            hotspots: [],
            keyFunctions: [],
            architectureAnalysis: "No architecture analysis available.",
            files: [],
            languages: {},
            repository: {
              name: "Unknown Repository",
              fullName: "Unknown Repository",
              stars: 0,
              forks: 0
            }
          };
          
          // Merge the loaded data with defaults
          const completeData = {
            ...defaultData,
            ...data,
            metrics: {
              ...defaultData.metrics,
              ...(data.metrics || {})
            }
          };
          
          setReportData(completeData);
        } catch (error) {
          console.error('Failed to parse report data:', error);
        }
      }
    }
    setLoading(false);
  }, [repoId]);

  const handleExportReport = () => {
    if (!reportData) return;
    
    const exportData = {
      ...reportData,
      generatedAt: new Date().toISOString(),
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.repository.name}-audit-report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareReport = async () => {
    if (!reportData) return;
    
    const shareData = {
      title: `Audit Report: ${reportData.repository.fullName}`,
      text: `Check out this comprehensive audit report for ${reportData.repository.fullName}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Report URL copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-gray-600 mb-6">The requested report could not be found.</p>
          <Link 
            to="/" 
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Generate New Report
          </Link>
        </div>
      </div>
    );
  }

  const CurrentPageComponent = pages[currentPage].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {reportData.repository.fullName}
                </h1>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Generated: {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">{reportData.repository.stars.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <GitFork className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{reportData.repository.forks.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleShareReport}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  title="Share Report"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleExportReport}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  title="Export Report"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-[73px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {pages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => setCurrentPage(index)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                  currentPage === index
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {page.icon}
                <span>{page.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CurrentPageComponent reportData={reportData} />
      </div>

      {/* Page Navigation */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 sticky bottom-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-2">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                    currentPage === index ? 'bg-indigo-600' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
              disabled={currentPage === pages.length - 1}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <span>Next</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;