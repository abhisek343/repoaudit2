import React from 'react';
import { 
  Activity, 
  GitCommit, 
  Calendar, 
  TrendingUp, 
  Clock,
  GitPullRequest,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { AnalysisResult } from '../../types';

interface ActivityPageProps {
  reportData: AnalysisResult;
}

const ActivityPage = ({ reportData }: ActivityPageProps) => {
  const { commits, repository } = reportData;

  // Process commit data for visualizations
  const processCommitData = () => {
    const commitsByMonth: Record<string, number> = {};
    const commitsByDay: Record<string, number> = {};
    const commitsByHour: Record<number, number> = {};

    commits.forEach(commit => {
      const date = new Date(commit.author.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const dayKey = date.toISOString().split('T')[0];
      const hour = date.getHours();

      commitsByMonth[monthKey] = (commitsByMonth[monthKey] || 0) + 1;
      commitsByDay[dayKey] = (commitsByDay[dayKey] || 0) + 1;
      commitsByHour[hour] = (commitsByHour[hour] || 0) + 1;
    });

    return { commitsByMonth, commitsByDay, commitsByHour };
  };

  const { commitsByMonth, commitsByDay, commitsByHour } = processCommitData();

  // Get recent months for chart
  const recentMonths = Object.entries(commitsByMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12)
    .reverse();

  const maxCommitsInMonth = Math.max(...recentMonths.map(([, count]) => count));

  // Activity heatmap data (simplified)
  const generateHeatmapData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return days.map(day => 
      hours.map(hour => ({
        day,
        hour,
        value: Math.floor(Math.random() * 10) // In real implementation, this would be actual commit data
      }))
    ).flat();
  };

  const heatmapData = generateHeatmapData();
  const maxHeatmapValue = Math.max(...heatmapData.map(d => d.value));

  // Calculate metrics
  const avgCommitsPerWeek = Math.round((commits.length / 52) * 10) / 10;
  const recentActivity = commits.filter(commit => {
    const commitDate = new Date(commit.author.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return commitDate > thirtyDaysAgo;
  }).length;

  // Mock data for issues and PRs (in real implementation, this would come from GitHub API)
  const issueMetrics = {
    totalIssues: repository.openIssues + Math.floor(Math.random() * 200),
    openIssues: repository.openIssues,
    closedIssues: Math.floor(Math.random() * 200),
    avgCloseTime: Math.floor(Math.random() * 10) + 2, // days
    closureRate: Math.round((Math.random() * 30 + 70) * 10) / 10 // 70-100%
  };

  const prMetrics = {
    totalPRs: Math.floor(Math.random() * 150) + 50,
    mergedPRs: Math.floor(Math.random() * 120) + 40,
    avgMergeTime: Math.floor(Math.random() * 5) + 1, // days
    mergeRate: Math.round((Math.random() * 20 + 80) * 10) / 10 // 80-100%
  };

  // Release timeline (mock data)
  const releases = [
    { version: 'v2.1.0', date: '2024-01-15', type: 'minor' },
    { version: 'v2.0.5', date: '2023-12-20', type: 'patch' },
    { version: 'v2.0.0', date: '2023-11-10', type: 'major' },
    { version: 'v1.9.2', date: '2023-10-05', type: 'patch' },
    { version: 'v1.9.0', date: '2023-09-15', type: 'minor' }
  ];

  return (
    <div className="space-y-8">
      {/* Activity Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <GitCommit className="w-8 h-8 text-blue-500" />
            <span className="text-sm font-medium text-green-600">+{recentActivity}</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{avgCommitsPerWeek}</h3>
          <p className="text-gray-600 text-sm">Avg Commits/Week</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8 text-orange-500" />
            <span className="text-sm font-medium text-blue-600">{issueMetrics.closureRate}%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{issueMetrics.avgCloseTime}d</h3>
          <p className="text-gray-600 text-sm">Avg Issue Close Time</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <GitPullRequest className="w-8 h-8 text-green-500" />
            <span className="text-sm font-medium text-green-600">{prMetrics.mergeRate}%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{prMetrics.avgMergeTime}d</h3>
          <p className="text-gray-600 text-sm">Avg PR Merge Time</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-purple-500" />
            <span className="text-sm font-medium text-green-600">Active</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{recentActivity}</h3>
          <p className="text-gray-600 text-sm">Commits (30 days)</p>
        </div>
      </div>

      {/* Monthly Commit History */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <BarChart3 className="w-6 h-6 text-blue-500 mr-3" />
          Monthly Commit History
        </h3>

        <div className="h-64 flex items-end space-x-2">
          {recentMonths.map(([month, count]) => (
            <div key={month} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600 cursor-pointer"
                style={{ height: `${(count / maxCommitsInMonth) * 200}px` }}
                title={`${month}: ${count} commits`}
              ></div>
              <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left">
                {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
          <span>Total commits in period: {recentMonths.reduce((sum, [, count]) => sum + count, 0)}</span>
          <span>Peak month: {Math.max(...recentMonths.map(([, count]) => count))} commits</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Activity Heatmap */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Calendar className="w-6 h-6 text-green-500 mr-3" />
            Activity Heatmap
          </h3>

          <div className="space-y-2">
            <div className="flex text-xs text-gray-600 mb-2">
              <div className="w-12"></div>
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="w-4 text-center">
                  {i % 6 === 0 ? i : ''}
                </div>
              ))}
            </div>
            
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="flex items-center">
                <div className="w-12 text-xs text-gray-600 text-right pr-2">{day}</div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const dataPoint = heatmapData.find(d => d.day === day && d.hour === hour);
                  const intensity = dataPoint ? dataPoint.value / maxHeatmapValue : 0;
                  return (
                    <div
                      key={hour}
                      className="w-4 h-4 rounded-sm border border-gray-200 cursor-pointer hover:border-gray-400"
                      style={{
                        backgroundColor: intensity > 0 
                          ? `rgba(34, 197, 94, ${0.2 + intensity * 0.8})` 
                          : '#f3f4f6'
                      }}
                      title={`${day} ${hour}:00 - ${dataPoint?.value || 0} commits`}
                    ></div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
            <span>Less</span>
            <div className="flex space-x-1">
              {[0, 0.25, 0.5, 0.75, 1].map(intensity => (
                <div
                  key={intensity}
                  className="w-3 h-3 rounded-sm border border-gray-200"
                  style={{
                    backgroundColor: intensity > 0 
                      ? `rgba(34, 197, 94, ${0.2 + intensity * 0.8})` 
                      : '#f3f4f6'
                  }}
                ></div>
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Issue/PR Funnel */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <TrendingUp className="w-6 h-6 text-purple-500 mr-3" />
            Issue & PR Funnel
          </h3>

          <div className="space-y-6">
            {/* Issues */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Issues</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Issues</span>
                  <span className="font-medium">{issueMetrics.totalIssues}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Closed Issues</span>
                  <span className="font-medium">{issueMetrics.closedIssues}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(issueMetrics.closedIssues / issueMetrics.totalIssues) * 100}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Open Issues</span>
                  <span className="font-medium">{issueMetrics.openIssues}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${(issueMetrics.openIssues / issueMetrics.totalIssues) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Pull Requests */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Pull Requests</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total PRs</span>
                  <span className="font-medium">{prMetrics.totalPRs}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Merged PRs</span>
                  <span className="font-medium">{prMetrics.mergedPRs}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(prMetrics.mergedPRs / prMetrics.totalPRs) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{issueMetrics.closureRate}%</div>
              <div className="text-xs text-green-700">Issue Closure Rate</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{prMetrics.mergeRate}%</div>
              <div className="text-xs text-purple-700">PR Merge Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Release Timeline */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Clock className="w-6 h-6 text-indigo-500 mr-3" />
          Release Timeline
        </h3>

        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
          
          <div className="space-y-6">
            {releases.map((release, index) => (
              <div key={release.version} className="relative flex items-center">
                <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white ${
                  release.type === 'major' ? 'bg-red-500' :
                  release.type === 'minor' ? 'bg-blue-500' :
                  'bg-green-500'
                }`}></div>
                
                <div className="ml-12 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{release.version}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(release.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      release.type === 'major' ? 'bg-red-100 text-red-800' :
                      release.type === 'minor' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {release.type}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center space-x-8 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Major Release</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Minor Release</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Patch Release</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;