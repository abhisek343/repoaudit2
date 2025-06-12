import { GitCommit, Users, Code, Shield, CheckSquare, Star, Activity, AlertTriangle } from 'lucide-react'; // Added CheckSquare, Activity, AlertTriangle
import { AnalysisResult } from '../types'; // Import AnalysisResult

interface MetricsGridProps {
  metrics: AnalysisResult['metrics']; // Use the metrics type from AnalysisResult
}

const MetricsGrid = ({ metrics }: MetricsGridProps) => {
  const metricCards = [
    {
      icon: <GitCommit className="w-6 h-6 text-blue-500" />,
      label: 'Total Commits',
      value: metrics.totalCommits?.toLocaleString() || 'N/A',
    },
    {
      icon: <Users className="w-6 h-6 text-green-500" />,
      label: 'Contributors',
      value: metrics.totalContributors?.toLocaleString() || 'N/A',
    },
    {
      icon: <Code className="w-6 h-6 text-purple-500" />,
      label: 'Lines of Code',
      value: metrics.linesOfCode > 0 ? `${Math.round(metrics.linesOfCode / 1000)}K` : 'N/A',
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-orange-500" />, // Changed icon for Bus Factor
      label: 'Bus Factor',
      value: metrics.busFactor?.toString() || 'N/A',
    },
    {
      icon: <CheckSquare className="w-6 h-6 text-teal-500" />, // Changed icon for Test Coverage
      label: 'Test Coverage',
      value: `${metrics.testCoverage?.toFixed(1) || 'N/A'}%`,
    },
    {
      icon: <Star className="w-6 h-6 text-yellow-500" />,
      label: 'Code Quality Score',
      value: `${metrics.codeQuality?.toFixed(1) || 'N/A'}/10`,
    },
    {
      icon: <Activity className="w-6 h-6 text-pink-500" />,
      label: 'Technical Debt Score',
      value: metrics.technicalDebtScore?.toString() || 'N/A', // Assuming higher is worse for debt
    },
     {
      icon: <Shield className="w-6 h-6 text-red-500" />,
      label: 'Security Score',
      value: `${metrics.securityScore?.toFixed(1) || 'N/A'}/10`, // Assuming higher is better
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
      {metricCards.map((metric, index) => (
        <div 
          key={index}
          className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2.5 bg-gray-100 rounded-lg">
              {metric.icon}
            </div>
            {/* Trend indicator can be added here later if data is available */}
          </div>
          
          <div>
            <h4 className="text-2xl font-bold text-gray-800 mb-0.5">
              {metric.value}
            </h4>
            <p className="text-gray-500 text-xs">
              {metric.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsGrid;
