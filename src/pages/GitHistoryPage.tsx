import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  GitCommit, 
  Users, 
  Calendar, 
  GitBranch,
  ArrowLeft,
  Filter
} from 'lucide-react';
import GitHistoryVisualization from '../components/diagrams/GitHistoryVisualization';
import { AnalysisResult } from '../types';

const GitHistoryPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [reportData, setReportData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');

  useEffect(() => {
    const loadReport = async () => {
      try {
        const storedReport = localStorage.getItem(`report_${reportId}`);
        if (!storedReport) {
          throw new Error('Report not found');
        }
        setReportData(JSON.parse(storedReport));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

  const filteredCommits = React.useMemo(() => {
    if (!reportData?.commits) return [];

    let commits = [...reportData.commits];

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (timeFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      } else if (timeFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      }
      commits = commits.filter(commit => new Date(commit.author.date) >= cutoff);
    }

    // Apply author filter
    if (authorFilter !== 'all') {
      commits = commits.filter(commit => 
        commit.author.name.toLowerCase() === authorFilter.toLowerCase()
      );
    }

    return commits;
  }, [reportData?.commits, timeFilter, authorFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600">{error || 'Failed to load report'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Git History Analysis
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                  className="rounded-lg border-gray-300 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="month">Last Month</option>
                  <option value="week">Last Week</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-600" />
                <select
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  className="rounded-lg border-gray-300 text-sm"
                >
                  <option value="all">All Authors</option>
                  {reportData.contributors.map(contributor => (
                    <option key={contributor.login} value={contributor.login}>
                      {contributor.login}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Git History Visualization */}
          <GitHistoryVisualization
            commits={filteredCommits}
            contributors={reportData.contributors}
            onCommitSelect={(commit) => {
              console.log('Selected commit:', commit);
            }}
          />

          {/* Repository Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-3">
                <GitCommit className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Total Commits</h3>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {reportData.metrics.totalCommits}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Contributors</h3>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {reportData.metrics.totalContributors}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-3">
                <Calendar className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Time Span</h3>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {new Date(reportData.commits[reportData.commits.length - 1].author.date).toLocaleDateString()} - {' '}
                {new Date(reportData.commits[0].author.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHistoryPage; 