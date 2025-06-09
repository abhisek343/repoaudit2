import React, { useEffect, useState } from 'react';
import { ContributorStats, Contributor } from '../types/contributor';
import ContributorService from '../services/contributorService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

const formatPercentage = (value: number, total: number) => {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error in ContributorStats:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-red-800 font-semibold">Something went wrong</h2>
          <p className="text-red-600">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const ContributorStatsComponent: React.FC = () => {
  const [stats, setStats] = useState<ContributorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    console.log('Component mounted');
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      console.log('Fetching stats for period:', period);
      setLoading(true);
      const contributorService = ContributorService.getInstance();
      const data = await contributorService.getContributorStats(period);
      console.log('Stats received:', data);
      
      if (!data || !data.topContributors) {
        console.error('Invalid data received:', data);
        setError('Invalid data received from server');
        return;
      }

      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contributor statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold">Error</h2>
        <p className="text-red-600">{error}</p>
        <button
          className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
          onClick={() => fetchStats()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats || !stats.topContributors || stats.topContributors.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No contributor data available for the selected period</p>
        <button
          className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
          onClick={() => fetchStats()}
        >
          Retry
        </button>
      </div>
    );
  }

  console.log('Rendering stats:', stats);

  const commitData = stats.topContributors.map(contributor => ({
    name: contributor.name,
    commits: contributor.commitDistribution.total,
    additions: contributor.commitDistribution.additions,
    deletions: contributor.commitDistribution.deletions,
  }));

  const totalCommits = stats.topContributors.reduce((sum, c) => sum + c.commitDistribution.total, 0);
  const totalAdditions = stats.topContributors.reduce((sum, c) => sum + c.commitDistribution.additions, 0);
  const totalDeletions = stats.topContributors.reduce((sum, c) => sum + c.commitDistribution.deletions, 0);

  const fileTypeData = Object.entries(
    stats.topContributors.reduce((acc, contributor) => {
      Object.entries(contributor.commitDistribution.byFileType).forEach(([type, count]) => {
        acc[type] = (acc[type] || 0) + count;
      });
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  console.log('Processed data:', {
    commitData,
    totalCommits,
    totalAdditions,
    totalDeletions,
    fileTypeData,
  });

  return (
    <ErrorBoundary>
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Contributor Statistics</h2>
          <div className="flex gap-4 mb-4">
            <button
              className={`px-4 py-2 rounded ${
                period === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
              onClick={() => setPeriod('week')}
            >
              Week
            </button>
            <button
              className={`px-4 py-2 rounded ${
                period === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
              onClick={() => setPeriod('month')}
            >
              Month
            </button>
            <button
              className={`px-4 py-2 rounded ${
                period === 'year' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
              onClick={() => setPeriod('year')}
            >
              Year
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Commit Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commitData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="commits" fill="#8884d8" name="Commits" />
                  <Bar dataKey="additions" fill="#82ca9d" name="Additions" />
                  <Bar dataKey="deletions" fill="#ff8042" name="Deletions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Total Commits: {totalCommits}</p>
              <p>Total Additions: {totalAdditions}</p>
              <p>Total Deletions: {totalDeletions}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">File Type Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fileTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {fileTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Top Contributors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.topContributors.map((contributor) => (
              <div key={contributor.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-4">
                  <img
                    src={contributor.avatarUrl}
                    alt={contributor.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold">{contributor.name}</h4>
                    <p className="text-sm text-gray-600">{contributor.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p>Total Contributions: {contributor.totalContributions}</p>
                  <p>Recent Activity:</p>
                  <ul className="text-sm">
                    <li>Commits: {contributor.recentActivity.commits}</li>
                    <li>Pull Requests: {contributor.recentActivity.pullRequests}</li>
                    <li>Issues: {contributor.recentActivity.issues}</li>
                    <li>Reviews: {contributor.recentActivity.reviews}</li>
                  </ul>
                  <p className="text-sm text-gray-600">
                    Last Active: {formatDate(contributor.recentActivity.lastActive)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ContributorStatsComponent; 