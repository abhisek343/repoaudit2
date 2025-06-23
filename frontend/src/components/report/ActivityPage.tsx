import { 
  GitCommit, 
  Calendar, 
  TrendingUp, 
  Clock,
  GitPullRequest,
  AlertCircle,
  BarChart3,
  Users
} from 'lucide-react';
import { AnalysisResult, Repository } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ActivityPageProps {
  analysisResult: AnalysisResult;
}

interface ExtendedMetrics {
  recentActivity?: number;
  avgCommitsPerWeek?: number;
  totalPRs?: number;
  mergedPRs?: number;
  avgPRMergeTime?: number;
  prMergeRate?: number;
}

const ActivityPage = ({ analysisResult: reportData }: ActivityPageProps) => {
  const { 
    commits = [], 
    repository = {} as Repository, // ← Use repository field
    contributors = [], 
    metrics
  } = reportData;

  const processCommitData = () => {
    const commitsByMonth: Record<string, number> = {};
    const commitsByDayOfWeek: Record<number, number> = {};
    const commitsByHour: Record<number, number> = {};

    if (!commits || commits.length === 0) {
      return { 
        commitsByMonth: {}, 
        commitsByDayOfWeek: {}, 
        commitsByHour: {}
      };
    }

    commits.forEach(commit => {
      const date = new Date(commit.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const dayOfWeek = date.getDay();
      const hour = date.getHours();

      commitsByMonth[monthKey] = (commitsByMonth[monthKey] || 0) + 1;
      commitsByDayOfWeek[dayOfWeek] = (commitsByDayOfWeek[dayOfWeek] || 0) + 1;
      commitsByHour[hour] = (commitsByHour[hour] || 0) + 1;
    });

    return { commitsByMonth, commitsByDayOfWeek, commitsByHour };
  };

  const { commitsByMonth, commitsByDayOfWeek, commitsByHour } = processCommitData();

  // Use backend-provided metrics, with fallback calculations for older reports
  const extendedMetrics = metrics as AnalysisResult['metrics'] & ExtendedMetrics;
  const recentCommitsCount = extendedMetrics.recentActivity ?? (() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return commits.filter(commit => new Date(commit.date) > thirtyDaysAgo).length;
  })();

  const avgCommitsPerWeek = extendedMetrics.avgCommitsPerWeek ?? (() => {
    if (commits.length === 0) return 0;
    const firstCommitDate = new Date(commits[commits.length - 1].date);
    const lastCommitDate = new Date(commits[0].date);
    const weeks = (lastCommitDate.getTime() - firstCommitDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
    return weeks > 0 ? Math.round((commits.length / weeks) * 10) / 10 : commits.length;
  })();

  const recentMonthsData = Object.entries(commitsByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      commits: count
    }));

  const dayOfWeekData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => ({
    day,
    commits: commitsByDayOfWeek[index] || 0
  }));

  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}:00`,
    commits: commitsByHour[hour] || 0
  }));

  const issueMetrics = {
    totalIssues: repository?.openIssues ?? 0,
    openIssues: repository?.openIssues ?? 0,
    closedIssues: 0,
    avgCloseTime: 0,
    closureRate: 0
  };

  const prMetrics = {
    totalPRs: extendedMetrics.totalPRs ?? 0,
    mergedPRs: extendedMetrics.mergedPRs ?? 0,
    avgMergeTime: extendedMetrics.avgPRMergeTime ?? 0,
    mergeRate: extendedMetrics.prMergeRate ?? 0
  };

  const releases = [
    { version: 'v2.1.0', date: '2024-01-15', type: 'minor' },
    { version: 'v2.0.0', date: '2023-12-01', type: 'major' },
    { version: 'v1.9.0', date: '2023-10-15', type: 'minor' },
    { version: 'v1.8.2', date: '2023-09-20', type: 'patch' }
  ];

  const getBarColor = (value: number, maxValue: number) => {
    const intensity = value / maxValue;
    if (intensity > 0.8) return '#dc2626'; // red-600
    if (intensity > 0.6) return '#ea580c'; // orange-600
    if (intensity > 0.4) return '#ca8a04'; // yellow-600
    if (intensity > 0.2) return '#65a30d'; // lime-600
    return '#16a34a'; // green-600
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Repository Activity Analysis</h1>
        <p className="text-gray-600">Comprehensive overview of development activity and trends</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Commits</p>
              <p className="text-2xl font-bold text-gray-900">{commits.length.toLocaleString()}</p>
            </div>
            <GitCommit className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {avgCommitsPerWeek} avg/week
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Activity</p>
              <p className="text-2xl font-bold text-gray-900">{recentCommitsCount}</p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Contributors</p>
              <p className="text-2xl font-bold text-gray-900">{contributors.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Active developers</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Issues</p>
              <p className="text-2xl font-bold text-gray-900">{issueMetrics.openIssues}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {issueMetrics.closureRate}% closure rate
          </p>
        </div>
      </div>

      {/* Commit Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Commits */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Monthly Commit Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recentMonthsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="commits" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day of Week Activity */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-green-500" />
            Activity by Day of Week
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="commits">
                {dayOfWeekData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.commits, Math.max(...dayOfWeekData.map(d => d.commits)))} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Activity Heatmap */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-purple-500" />
          Hourly Activity Distribution
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" interval={3} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="commits" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Issues and PRs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
            Issue Management
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Issues</span>
              <span className="font-semibold">{issueMetrics.totalIssues}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Open Issues</span>
              <span className="font-semibold text-orange-600">{issueMetrics.openIssues}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Closed Issues</span>
              <span className="font-semibold text-green-600">{issueMetrics.closedIssues}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg. Close Time</span>
              <span className="font-semibold">{issueMetrics.avgCloseTime} days</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <GitPullRequest className="w-5 h-5 mr-2 text-blue-500" />
            Pull Request Statistics
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total PRs</span>
              <span className="font-semibold">{prMetrics.totalPRs}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Merged PRs</span>
              <span className="font-semibold text-green-600">{prMetrics.mergedPRs}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Merge Rate</span>
              <span className="font-semibold">{prMetrics.mergeRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg. Merge Time</span>
              <span className="font-semibold">{prMetrics.avgMergeTime} days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Release Timeline */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
          Recent Releases
        </h3>
        <div className="space-y-3">
          {releases.map((release, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  release.type === 'major' ? 'bg-red-500' :
                  release.type === 'minor' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <span className="font-medium">{release.version}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  release.type === 'major' ? 'bg-red-100 text-red-800' :
                  release.type === 'minor' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`} >
                  {release.type}
                </span>
              </div>
              <span className="text-gray-500 text-sm">{release.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Contributors */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-purple-500" />
          Top Contributors
        </h3>
        <div className="space-y-3">
          {contributors.slice(0, 10).map((contributor, index) => (
            <div key={contributor.login} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                <img 
                  src={contributor.avatarUrl} 
                  alt={contributor.login}
                  className="w-8 h-8 rounded-full"
                />
                <span className="font-medium">{contributor.login}</span>
              </div>
              <span className="text-gray-600">{contributor.contributions} commits</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;
