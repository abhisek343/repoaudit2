import React, { useState, useEffect, useCallback } from 'react';
import { getReports, getReportById, deleteReport } from '../services/reportService';
import { toast } from 'react-hot-toast';
import { AnalysisResult, SavedReport } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Code,
  Eye,
  ExternalLink,
  FileCode2,
  Github,
  Layers,
  Shield,
  Target,
  Users,
  AlertTriangle,
  Loader2,
  Clock,
  Trash2
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [latestReport, setLatestReport] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const allReports = await getReports();
      setReports(allReports);
      
      if (allReports.length > 0) {
        // Get the most recent report
        const fullReport = await getReportById(allReports[0].id);
        setLatestReport(fullReport || null);
      } else {
        setLatestReport(null);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load reports.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    const handleAnalysisComplete = () => {
      fetchReports();
    };

    window.addEventListener('analysisComplete', handleAnalysisComplete);

    return () => {
      window.removeEventListener('analysisComplete', handleAnalysisComplete);
    };
  }, [fetchReports]);

  const navigateToReport = async (reportId: string) => {
    try {
      let reportData = latestReport && latestReport.id === reportId ? latestReport : await getReportById(reportId);
      if (reportData) {
        navigate(`/report/${reportId}`, { state: { analysisResultFromNavigation: reportData } });
      } else {
        navigate(`/report/${reportId}`);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
      navigate(`/report/${reportId}`);
    }
  };

  const handleDeleteReport = async (reportId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await deleteReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success('Report deleted successfully');
    } catch (err) {
      console.error('Failed to delete report:', err);
      toast.error('Failed to delete report');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center text-red-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p>{error}</p>
          <button
            onClick={fetchReports}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-sm">
          <FileCode2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No reports found</h2>
          <p className="text-gray-600 mb-6">Run an analysis to generate reports and see them here.</p>
          <button 
            onClick={() => navigate('/analyze')}
            className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Analyze a Repository
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Analysis Dashboard</h1>
            <button 
              onClick={() => navigate('/analyze')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              New Analysis
            </button>
          </div>
          <p className="text-gray-600">
            View and manage your repository analysis reports
          </p>
        </header>

        {/* Latest Report Preview */}
        {latestReport && latestReport.basicInfo && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  Latest Analysis: {latestReport.basicInfo?.fullName || 'Unknown'}
                </h2>
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {getTimeAgo(latestReport.createdAt)}
                </span>
              </div>
              
              <div className="text-sm text-gray-500 mb-4">
                {latestReport.basicInfo?.description || 'No description available'}
              </div>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="text-indigo-600 text-xs font-medium mb-1 flex items-center">
                    <FileCode2 className="h-3.5 w-3.5 mr-1" />
                    FILES
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {latestReport.metrics?.fileCount !== undefined ? latestReport.metrics.fileCount.toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <div className="text-emerald-600 text-xs font-medium mb-1 flex items-center">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    CONTRIBUTORS
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {latestReport.metrics?.totalContributors?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-amber-600 text-xs font-medium mb-1 flex items-center">
                    <Target className="h-3.5 w-3.5 mr-1" />
                    CODE QUALITY
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {latestReport.metrics?.codeQuality ? `${latestReport.metrics.codeQuality}%` : 'N/A'}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-red-600 text-xs font-medium mb-1 flex items-center">
                    <Shield className="h-3.5 w-3.5 mr-1" />
                    SECURITY ISSUES
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {latestReport.securityIssues?.length?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => navigateToReport(latestReport.id)}
                  className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  View Full Report
                  <ExternalLink className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-2">All Reports</h2>
            <p className="text-sm text-gray-500">Click on any report to view details</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Repository</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Viewed</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr 
                    key={report.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigateToReport(report.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Github className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="font-medium text-gray-900">{report.repositoryName}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{(report.summary || '').substring(0, 60)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.lastAccessed)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                        {report.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigateToReport(report.id); }}
                          className="text-indigo-600 hover:text-indigo-900 font-medium flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button
                          onClick={(e) => handleDeleteReport(report.id, e)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
