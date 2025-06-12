import { 
  Users, 
  AlertTriangle, 
  Star,
  MessageCircle,
  CheckCircle,
  X, // For missing community files
  Award,
  UserPlus,
  BarChart // For contributor trends
} from 'lucide-react'; // Removed TrendingUp, Calendar, GitCommit
import { AnalysisResult, ProcessedContributor, Repository } from '../../types';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'; // Aliased BarChart, Removed Cell, Added Legend


interface CommunityPageProps {
  reportData: AnalysisResult;
}

const CommunityPage = ({ reportData }: CommunityPageProps) => {
  const { 
    contributors = [], 
    commits = [], 
    metrics = {} as any, 
    repository = {} as Repository, // ← Use repository field
    files = [] // ← Add files for community files check
  } = reportData;

  const totalContributions = (contributors || []).reduce((sum, c) => sum + c.contributions, 0);
  const topContributorShare = totalContributions > 0 && contributors && contributors.length > 0 ? (contributors[0].contributions / totalContributions) : 0;
  
  const activeContributors = (contributors || []).map(contributor => {
    const recentCommits = commits.filter(commit => {
        const authorName = commit.author.toLowerCase();
        const contributorLogin = contributor.login.toLowerCase();
        return authorName.includes(contributorLogin);
    });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const hasRecentActivityInLast30Days = recentCommits.some(commit => 
        new Date(commit.date) > thirtyDaysAgo
    );

    return {
      ...contributor,
      recentCommitsCount: recentCommits.length,
      isActiveInLast30Days: hasRecentActivityInLast30Days, // More specific flag
      impactScore: contributor.contributions / (totalContributions || 1) // Relative impact
    };
  }).sort((a, b) => b.contributions - a.contributions); // Ensure sorted for leaderboard

  const communityFiles = {
    readme: files.some(f => f.name.toLowerCase() === 'readme.md'),
    contributing: files.some(f => f.name.toLowerCase().includes('contributing')),
    codeOfConduct: files.some(f => f.name.toLowerCase().includes('code_of_conduct')),
    license: !!repository.license,
    changelog: files.some(f => f.name.toLowerCase().includes('changelog')),
    security: files.some(f => f.name.toLowerCase() === 'security.md'),
  };
  const communityHealthScore = Object.values(communityFiles).filter(Boolean).length;
  const totalCommunityFiles = Object.keys(communityFiles).length;

  const generateContributorTrends = () => {
    const trends: { month: string; new: number; active: number; total: number }[] = [];
    if (!commits || commits.length === 0) return { trends, maxTrendValue: 0 };

    const contributorFirstCommit: Record<string, string> = {}; 
    const monthlyActivity: Record<string, { newSet: Set<string>, activeSet: Set<string> }> = {};

    const sortedCommits = [...commits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedCommits.forEach(commit => {
      const commitDate = new Date(commit.date);
      const monthKey = `${commitDate.getFullYear()}-${String(commitDate.getMonth() + 1).padStart(2, '0')}`;
      const authorLogin = contributors.find(c => c.login.toLowerCase() === commit.author.toLowerCase())?.login || commit.author; 

      if (!monthlyActivity[monthKey]) {
        monthlyActivity[monthKey] = { newSet: new Set(), activeSet: new Set() };
      }
      
      monthlyActivity[monthKey].activeSet.add(authorLogin);

      if (!contributorFirstCommit[authorLogin]) {
        contributorFirstCommit[authorLogin] = monthKey;
      }
      if (contributorFirstCommit[authorLogin] === monthKey) {
        monthlyActivity[monthKey].newSet.add(authorLogin);
      }
    });

    const allMonthKeys = Object.keys(monthlyActivity).sort();
    let maxTotal = 0;

    allMonthKeys.forEach(monthKey => {
      const newCount = monthlyActivity[monthKey].newSet.size;
      const activeCount = monthlyActivity[monthKey].activeSet.size;
      const total = activeCount; 
      if (total > maxTotal) maxTotal = total;
      trends.push({
        month: monthKey,
        new: newCount,
        active: activeCount - newCount, 
        total: total
      });
    });
    
    return { trends: trends.slice(-12), maxTrendValue: maxTotal };
  };

  const { trends: contributorTrends } = generateContributorTrends(); 
  
  const topReviewers = (reportData.contributors || []).filter(c => ((c as any).reviewCount || 0) > 0)
    .sort((a, b) => ((b as any).reviewCount || 0) - ((a as any).reviewCount || 0))
    .slice(0, 5).map(contributor => ({
    ...contributor,
    reviews: (contributor as any).reviewCount || 0, 
    avgReviewTime: metrics.avgReviewTime || 0 
  })).filter(r => r.reviews > 0);


  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users />} label="Total Contributors" value={(contributors || []).length.toString()} trendText={`${activeContributors.filter(c => c.isActiveInLast30Days).length} active`} />
        <StatCard icon={<AlertTriangle />} label="Bus Factor" value={metrics.busFactor.toString()} trendText={metrics.busFactor <= 2 ? 'Risk' : 'Healthy'} trendColor={metrics.busFactor <= 2 ? 'text-red-600' : 'text-green-600'} />
        <StatCard icon={<UserPlus />} label="Active (30d)" value={activeContributors.filter(c => c.isActiveInLast30Days).length.toString()} trendText="Recent Activity" />
        <StatCard icon={<Award />} label="Top Contributor" value={(contributors && contributors[0]?.contributions.toLocaleString()) || 'N/A'} trendText={`${Math.round(topContributorShare * 100)}% of total`} trendColor="text-purple-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Star className="w-5 h-5 md:w-6 md:h-6 text-yellow-500 mr-3" />
            Contributor Leaderboard
          </h3>
          {activeContributors.length > 0 ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {activeContributors.slice(0, 10).map((contributor, index) => (
                <ContributorCard key={contributor.login} contributor={contributor} rank={index + 1} topContribution={activeContributors[0]?.contributions || 1} />
              ))}
            </div>
          ) : <p className="text-gray-500 text-center py-10">No contributor data available.</p>}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
              Bus Factor Analysis
            </h4>
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-orange-600 mb-2">{metrics.busFactor}</div>
              <p className="text-sm text-gray-700">
                Key contributors whose absence might impact development.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <InfoPill color="blue">Top Contributor Share: {Math.round(topContributorShare * 100)}%</InfoPill>
              {metrics.busFactor <= 2 && <InfoPill color="red">Risk: High dependency on few contributors.</InfoPill>}
              <InfoPill color="green">Active Top Contributors: {activeContributors.filter(c => c.isActiveInLast30Days && c.impactScore && c.impactScore > 0.05).length}</InfoPill>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              Community Health Files
            </h4>
            <div className="space-y-2.5">
              {Object.entries(communityFiles).map(([file, exists]) => (
                <FileCheckItem key={file} fileName={file} exists={exists} />
              ))}
            </div>
            <div className="mt-4 pt-3 border-t">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Health Score: {communityHealthScore}/{totalCommunityFiles}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${(communityHealthScore / totalCommunityFiles) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <BarChart className="w-5 h-5 md:w-6 md:h-6 text-green-500 mr-3" />
          Contributor Activity Trends (Last 12 Months)
        </h3>
        {contributorTrends.length > 0 ? (
        <div className="h-80"> 
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={contributorTrends} margin={{ top: 5, right: 20, bottom: 50, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tickFormatter={(monthKey) => new Date(monthKey + '-02').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                angle={-45}
                textAnchor="end"
                height={60} 
                interval={0} 
                tick={{ fontSize: 10 }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => [`${value} contributors`, name === 'new' ? 'New' : 'Active']} />
              <Legend wrapperStyle={{ fontSize: "14px" }} />
              <Bar dataKey="new" stackId="a" fill="#10B981" name="New Contributors" radius={[4, 4, 0, 0]} />
              <Bar dataKey="active" stackId="a" fill="#3B82F6" name="Returning Active" radius={[4, 4, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        </div>
        ) : <p className="text-gray-500 text-center py-10">No contributor trend data available.</p>}
      </div>

      {/* Top Reviewers */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        {topReviewers.length > 0 ? (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <MessageCircle className="w-6 h-6 text-purple-500 mr-3" />
              Top Code Reviewers
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topReviewers.map((reviewer) => (
                <ReviewerCard key={reviewer.login} reviewer={reviewer} maxReviews={Math.max(1, ...topReviewers.map(r => r.reviews))} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No code reviewer data available.</p>
          </div>
        )}
      </div>
    </div>
  );
};


// Helper components for StatCard, ContributorCard, FileCheckItem, InfoPill, ReviewerCard
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; trendText?: string; trendColor?: string }> = 
({ icon, label, value, trendText, trendColor = 'text-green-600' }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
      {trendText && <span className={`text-xs font-medium ${trendColor}`}>{trendText}</span>}
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    <p className="text-gray-600 text-sm">{label}</p>
  </div>
);

interface ContributorCardProps {
  contributor: ProcessedContributor & { isActiveInLast30Days?: boolean; recentCommitsCount?: number; impactScore?: number };
  rank: number;
  topContribution: number;
}
const ContributorCard: React.FC<ContributorCardProps> = ({ contributor, rank, topContribution }) => {
    const impactColor = contributor.impactScore && contributor.impactScore > 0.2 ? 'bg-red-500' : contributor.impactScore && contributor.impactScore > 0.1 ? 'bg-yellow-500' : 'bg-blue-500';
    const impactLabel = contributor.impactScore && contributor.impactScore > 0.2 ? 'High Impact' : contributor.impactScore && contributor.impactScore > 0.1 ? 'Medium Impact' : 'Regular Contributor';
    return (
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors duration-200 bg-white shadow-sm">
            <div className="flex items-center space-x-3">
            <div className="relative">
                <img src={contributor.avatarUrl} alt={contributor.login} className="w-12 h-12 rounded-full border-2 border-gray-200" />
                {rank <= 3 && (
                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ${
                    rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-gray-400' : 'bg-orange-400'
                }`}>
                    {rank}
                </div>
                )}
            </div>
            <div>
                <h4 className="font-semibold text-gray-800 text-sm md:text-base">{contributor.login}</h4>
                <p className="text-xs text-gray-500">{contributor.contributions.toLocaleString()} contributions</p>
                {(contributor as any).type === 'Bot' && <span className="text-xs text-blue-500"> (Bot)</span>}
            </div>
            </div>
            <div className="text-right">
                {contributor.isActiveInLast30Days && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full mb-1 inline-block">Active</span>
                )}
                <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block text-white ${impactColor}`}>{impactLabel}</div>
                 <div className="w-20 md:w-24 bg-gray-200 rounded-full h-1.5 mt-1.5">
                    <div className={`${impactColor} h-1.5 rounded-full`} style={{ width: `${(contributor.contributions / topContribution) * 100}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const FileCheckItem: React.FC<{ fileName: string; exists: boolean }> = ({ fileName, exists }) => (
  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
    <span className="text-sm text-gray-700 capitalize">
      {fileName.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
    </span>
    {exists ? <CheckCircle className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-400" />}
  </div>
);

const InfoPill: React.FC<{ children: React.ReactNode; color: 'blue' | 'green' | 'red' | 'yellow' }> = ({ children, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return <div className={`p-2.5 rounded-lg border text-xs ${colors[color]}`}>{children}</div>;
};

interface ReviewerCardProps {
    reviewer: ProcessedContributor & { reviews?: number; avgReviewTime?: number };
    maxReviews: number;
}
const ReviewerCard: React.FC<ReviewerCardProps> = ({ reviewer, maxReviews }) => (
    <div className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 transition-colors duration-200 bg-white shadow-sm">
        <div className="flex items-center space-x-3 mb-3">
        <img src={reviewer.avatarUrl} alt={reviewer.login} className="w-10 h-10 rounded-full border border-purple-200" />
        <div>
            <h4 className="font-semibold text-gray-800">{reviewer.login}</h4>
            <p className="text-xs text-purple-600">{reviewer.reviews || 0} reviews</p>
        </div>
        </div>
        <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
            <span className="text-gray-500">Avg Review Time:</span>
            <span className="font-medium text-gray-700">{reviewer.avgReviewTime ? reviewer.avgReviewTime.toFixed(1) : 'N/A'}h</span>
        </div>
        <div className="flex justify-between">
            <span className="text-gray-500">Contributions:</span>
            <span className="font-medium text-gray-700">{reviewer.contributions.toLocaleString()}</span>
        </div>
        </div>
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
        <div 
            className="bg-purple-500 h-1.5 rounded-full" 
            style={{ width: `${((reviewer.reviews || 0) / maxReviews) * 100}%` }}
        ></div>
        </div>
    </div>
);

export default CommunityPage;
