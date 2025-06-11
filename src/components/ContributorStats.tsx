import React, { useState } from 'react'; // Removed useEffect
import { AnalysisResult, ProcessedContributor, ProcessedCommit } from '../types';
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#FF69B4', '#A020F0'];

const formatDate = (dateString: string | undefined) => {
  if (!dateString || dateString.trim() === '') return 'N/A'; // Added check for empty string
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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onRetry?: () => void }) {
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
          <p className="text-red-600">{this.state.error?.message || 'An unknown error occurred.'}</p>
          {this.props.onRetry && (
            <button
              className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
              onClick={this.props.onRetry}
            >
              Retry
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

interface ContributorStatsComponentProps {
  reportData: AnalysisResult;
}

const ContributorStatsComponent: React.FC<ContributorStatsComponentProps> = ({ reportData }) => {
  const [error, setError] = useState<string | null>(null);

  const processContributorData = (data: AnalysisResult): ProcessedContributor[] | null => {
    try {
      if (!data.contributors || data.contributors.length === 0) {
        return null;
      }
      return data.contributors.sort((a,b) => b.contributions - a.contributions);
    } catch (err) {
      console.error('Error processing contributor data from reportData:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to process contributor statistics from report data');
      }
      return null;
    }
  };
  
  const processedContributors = processContributorData(reportData);

  if (error) {
    return (
       <ErrorBoundary>
         <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
           <h2 className="text-red-800 font-semibold">Error Processing Contributor Data</h2>
           <p className="text-red-600">{error}</p>
         </div>
       </ErrorBoundary>
    );
  }

  if (!processedContributors || processedContributors.length === 0) {
    return (
      <ErrorBoundary>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            No contributor data available in the report.
          </p>
        </div>
      </ErrorBoundary>
    );
  }

  // Derive data for charts from reportData
  const commitData = processedContributors.slice(0, 10).map(contributor => {
    // Sum additions/deletions from commits authored by this contributor
    let additions = 0;
    let deletions = 0;
    reportData.commits.forEach((commit: ProcessedCommit) => {
      if (commit.author === contributor.login) {
        additions += commit.stats?.additions || 0;
        deletions += commit.stats?.deletions || 0;
      }
    });
    return {
      name: contributor.login,
      commits: contributor.contributions, // Total contributions
      additions: additions,
      deletions: deletions,
    };
  });

  const totalCommitsInPeriod = reportData.commits.length;
  const totalAdditionsInPeriod = reportData.commits.reduce((sum, commit) => sum + (commit.stats?.additions || 0), 0);
  const totalDeletionsInPeriod = reportData.commits.reduce((sum, commit) => sum + (commit.stats?.deletions || 0), 0);

  const fileTypeData = Object.entries(
    reportData.commits.reduce((acc, commit) => {
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  return (
    <ErrorBoundary>
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Contributor Statistics (from Report)</h2>
           <p className="text-sm text-gray-500">
            Displaying data from the generated report.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Commit Distribution by Contributor</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commitData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "14px" }} />
                  <Bar dataKey="commits" fill={COLORS[0]} name="Total Contributions" />
                  <Bar dataKey="additions" fill={COLORS[1]} name="Additions in Commits" />
                  <Bar dataKey="deletions" fill={COLORS[2]} name="Deletions in Commits" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Total Commits in Report: {totalCommitsInPeriod}</p>
              <p>Total Additions in Report: {totalAdditionsInPeriod.toLocaleString()}</p>
              <p>Total Deletions in Report: {totalDeletionsInPeriod.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">File Types in Commits (Aggregated)</h3>
            {fileTypeData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fileTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent! * 100).toFixed(0)}%`}
                      legendType="square"
                    >
                      {fileTypeData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "14px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-10">No file type data available in commits.</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-6 text-gray-800">Top Contributors (Overall)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {processedContributors.slice(0,6).map((contributor) => ( // Show top 6 contributors
              <div key={contributor.login} className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <img
                    src={contributor.avatarUrl}
                    alt={contributor.login}
                    className="w-16 h-16 rounded-full mr-4 border-2 border-indigo-200"
                  />
                  <div>
                    <h4 className="text-lg font-bold text-indigo-700">{contributor.login}</h4>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium">Total Contributions:</span> {contributor.contributions.toLocaleString()}
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
