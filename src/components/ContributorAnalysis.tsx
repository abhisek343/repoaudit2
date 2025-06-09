import React from 'react';
import { Users, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';

interface ContributorAnalysisProps {
  contributors?: Array<{
    login: string;
    contributions: number;
    avatarUrl: string;
    type: string;
  }>;
  commits?: Array<{
    sha: string;
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  }>;
  busFactor?: number;
}

const ContributorAnalysis = ({ contributors = [], commits = [], busFactor = 3 }: ContributorAnalysisProps) => {
  // Calculate activity metrics
  const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
  const topContributorShare = contributors[0]?.contributions / totalContributions || 0;
  
  // Group commits by month for timeline
  const commitsByMonth = commits.reduce((acc, commit) => {
    const date = new Date(commit.author.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[monthKey] = (acc[monthKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentMonths = Object.entries(commitsByMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 3);

  // Determine activity status for contributors
  const activeContributors = contributors.map(contributor => {
    const recentCommits = commits.filter(commit => 
      commit.author.name.toLowerCase().includes(contributor.login.toLowerCase()) ||
      commit.author.email.toLowerCase().includes(contributor.login.toLowerCase())
    );
    
    const hasRecentActivity = recentCommits.some(commit => {
      const commitDate = new Date(commit.author.date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return commitDate > threeMonthsAgo;
    });

    return {
      ...contributor,
      recent: hasRecentActivity,
      impact: contributor.contributions > totalContributions * 0.2 ? 'high' :
              contributor.contributions > totalContributions * 0.1 ? 'medium' : 'low'
    };
  });

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Users className="w-6 h-6 text-blue-500 mr-3" />
        Contributor Analysis
      </h3>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Top Contributors */}
        <div className="lg:col-span-2">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Top Contributors
          </h4>
          {activeContributors.length > 0 ? (
            <div className="space-y-4">
              {activeContributors.slice(0, 6).map((contributor, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {contributor.login.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h5 className="font-medium text-gray-900">
                          {contributor.login}
                        </h5>
                        {contributor.recent && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Active
                          </span>
                        )}
                        {contributor.type === 'Bot' && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Bot
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {contributor.contributions} contributions
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      contributor.impact === 'high' ? 'bg-red-100 text-red-800' :
                      contributor.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {contributor.impact} impact
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          contributor.impact === 'high' ? 'bg-red-500' :
                          contributor.impact === 'medium' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${(contributor.contributions / (contributors[0]?.contributions || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No contributor data available</p>
            </div>
          )}
        </div>

        {/* Bus Factor & Insights */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-500 mr-2" />
              <h4 className="text-lg font-semibold text-gray-900">Bus Factor</h4>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">
                {busFactor}
              </div>
              <p className="text-sm text-gray-700">
                Minimum contributors whose absence would significantly impact development
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
              Key Insights
            </h4>
            
            <div className="space-y-3 text-sm">
              {contributors.length > 0 && (
                <>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-blue-800">
                      <strong>Contribution Distribution:</strong> Top contributor accounts for {Math.round(topContributorShare * 100)}% of commits
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-green-800">
                      <strong>Active Contributors:</strong> {activeContributors.filter(c => c.recent).length} out of {Math.min(6, contributors.length)} top contributors are currently active
                    </p>
                  </div>
                  
                  {activeContributors.some(c => c.type === 'Bot') && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-purple-800">
                        <strong>Automation:</strong> Bot contributors help maintain consistent development workflow
                      </p>
                    </div>
                  )}
                </>
              )}

              {busFactor <= 2 && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-yellow-800">
                    <strong>Risk:</strong> Low bus factor indicates dependency on few key contributors
                  </p>
                </div>
              )}
            </div>
          </div>

          {recentMonths.length > 0 && (
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Recent Activity
              </h5>
              <div className="space-y-2">
                {recentMonths.map(([month, count], index) => (
                  <div key={month} className="flex justify-between text-xs text-gray-600">
                    <span>{new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    <span className={`font-medium ${index === 0 ? 'text-green-600' : ''}`}>
                      {count} commits
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContributorAnalysis;