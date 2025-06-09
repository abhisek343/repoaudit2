import React from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  GitCommit,
  Star,
  MessageCircle,
  CheckCircle,
  X,
  Award,
  UserPlus
} from 'lucide-react';
import { AnalysisResult } from '../../types';

interface CommunityPageProps {
  reportData: AnalysisResult;
}

const CommunityPage = ({ reportData }: CommunityPageProps) => {
  const { contributors, commits, metrics, repository } = reportData;

  // Calculate contributor metrics
  const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
  const topContributorShare = contributors[0]?.contributions / totalContributions || 0;
  
  // Analyze contributor activity
  const activeContributors = contributors.map(contributor => {
    const recentCommits = commits.filter(commit => 
      commit.author.name.toLowerCase().includes(contributor.login.toLowerCase()) ||
      commit.author.email.toLowerCase().includes(contributor.login.toLowerCase())
    );
    
    const hasRecentActivity = recentCommits.some(commit => {
      const commitDate = new Date(commit.author.date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      return commitDate > threeMonthsAgo;
    });

    return {
      ...contributor,
      recent: hasRecentActivity,
      impact: contributor.contributions > totalContributions * 0.2 ? 'high' :
              contributor.contributions > totalContributions * 0.1 ? 'medium' : 'low',
      recentCommits: recentCommits.length
    };
  });

  // Mock data for additional community metrics
  const communityFiles = {
    codeOfConduct: Math.random() > 0.3,
    contributing: Math.random() > 0.2,
    readme: true,
    license: !!repository.license,
    changelog: Math.random() > 0.4,
    security: Math.random() > 0.6
  };

  // Generate contributor trends (mock data)
  const generateContributorTrends = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      
      // Mock data for new vs returning contributors
      const newContributors = Math.floor(Math.random() * 5) + 1;
      const returningContributors = Math.floor(Math.random() * 10) + 5;
      
      months.push({
        month: monthKey,
        new: newContributors,
        returning: returningContributors,
        total: newContributors + returningContributors
      });
    }
    
    return months;
  };

  const contributorTrends = generateContributorTrends();
  const maxTrendValue = Math.max(...contributorTrends.map(m => m.total));

  // Top reviewers (mock data)
  const topReviewers = contributors.slice(0, 5).map(contributor => ({
    ...contributor,
    reviews: Math.floor(Math.random() * 50) + 10,
    avgReviewTime: Math.floor(Math.random() * 24) + 1 // hours
  }));

  return (
    <div className="space-y-8">
      {/* Community Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="text-sm font-medium text-green-600">+{activeContributors.filter(c => c.recent).length}</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{contributors.length}</h3>
          <p className="text-gray-600 text-sm">Total Contributors</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <span className={`text-sm font-medium ${metrics.busFactor <= 2 ? 'text-red-600' : 'text-green-600'}`}>
              {metrics.busFactor <= 2 ? 'Risk' : 'Safe'}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{metrics.busFactor}</h3>
          <p className="text-gray-600 text-sm">Bus Factor</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <UserPlus className="w-8 h-8 text-green-500" />
            <span className="text-sm font-medium text-blue-600">Active</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {activeContributors.filter(c => c.recent).length}
          </h3>
          <p className="text-gray-600 text-sm">Active Contributors</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <Award className="w-8 h-8 text-purple-500" />
            <span className="text-sm font-medium text-purple-600">{Math.round(topContributorShare * 100)}%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {contributors[0]?.contributions || 0}
          </h3>
          <p className="text-gray-600 text-sm">Top Contributor</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Contributor Leaderboard */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Star className="w-6 h-6 text-yellow-500 mr-3" />
              Contributor Leaderboard
            </h3>

            <div className="space-y-4">
              {activeContributors.slice(0, 8).map((contributor, index) => (
                <div 
                  key={contributor.login}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {contributor.login.charAt(0).toUpperCase()}
                      </div>
                      {index < 3 && (
                        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                        }`}>
                          {index + 1}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-gray-900">{contributor.login}</h4>
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
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{contributor.contributions} contributions</span>
                        <span>{contributor.recentCommits} recent commits</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mb-2 ${
                      contributor.impact === 'high' ? 'bg-red-100 text-red-800' :
                      contributor.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {contributor.impact} impact
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
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
          </div>
        </div>

        {/* Bus Factor Analysis */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
              Bus Factor Analysis
            </h4>
            
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-orange-600 mb-2">{metrics.busFactor}</div>
              <p className="text-sm text-gray-700">
                Critical contributors whose absence would significantly impact development
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800">
                  <strong>Distribution:</strong> Top contributor: {Math.round(topContributorShare * 100)}%
                </p>
              </div>
              
              {metrics.busFactor <= 2 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-red-800">
                    <strong>Risk:</strong> High dependency on few contributors
                  </p>
                </div>
              )}
              
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-green-800">
                  <strong>Active:</strong> {activeContributors.filter(c => c.recent).length} of top contributors are active
                </p>
              </div>
            </div>
          </div>

          {/* Community Health Files */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              Community Health
            </h4>
            
            <div className="space-y-3">
              {Object.entries(communityFiles).map(([file, exists]) => (
                <div key={file} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">
                    {file.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  {exists ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Health Score: {Object.values(communityFiles).filter(Boolean).length}/6
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${(Object.values(communityFiles).filter(Boolean).length / 6) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contributor Trends */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 text-green-500 mr-3" />
          New vs Returning Contributors
        </h3>

        <div className="h-64 flex items-end space-x-2">
          {contributorTrends.map((month) => (
            <div key={month.month} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col">
                <div
                  className="w-full bg-blue-500 transition-all duration-300 hover:bg-blue-600 cursor-pointer"
                  style={{ height: `${(month.returning / maxTrendValue) * 180}px` }}
                  title={`${month.month}: ${month.returning} returning contributors`}
                ></div>
                <div
                  className="w-full bg-green-500 transition-all duration-300 hover:bg-green-600 cursor-pointer"
                  style={{ height: `${(month.new / maxTrendValue) * 180}px` }}
                  title={`${month.month}: ${month.new} new contributors`}
                ></div>
              </div>
              <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left">
                {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center space-x-8 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-600">New Contributors</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-600">Returning Contributors</span>
          </div>
        </div>
      </div>

      {/* Top Reviewers */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <MessageCircle className="w-6 h-6 text-purple-500 mr-3" />
          Top Code Reviewers
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topReviewers.map((reviewer, index) => (
            <div key={reviewer.login} className="p-6 border border-gray-200 rounded-xl hover:border-purple-300 transition-colors duration-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                  {reviewer.login.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{reviewer.login}</h4>
                  <p className="text-sm text-gray-600">{reviewer.reviews} reviews</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Review Time:</span>
                  <span className="font-medium">{reviewer.avgReviewTime}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contributions:</span>
                  <span className="font-medium">{reviewer.contributions}</span>
                </div>
              </div>

              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${(reviewer.reviews / Math.max(...topReviewers.map(r => r.reviews))) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;