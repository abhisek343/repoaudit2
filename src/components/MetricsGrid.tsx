import React from 'react';
import { GitCommit, Users, Code, Shield, TestTube, Star } from 'lucide-react';

interface MetricsGridProps {
  metrics: {
    totalCommits: number;
    totalContributors: number;
    linesOfCode: number;
    busFactor: number;
    testCoverage: number;
    codeQuality: number;
  };
}

const MetricsGrid = ({ metrics }: MetricsGridProps) => {
  const metricCards = [
    {
      icon: <GitCommit className="w-6 h-6 text-blue-500" />,
      label: 'Total Commits',
      value: metrics.totalCommits.toLocaleString(),
      change: '+12%',
      trend: 'up'
    },
    {
      icon: <Users className="w-6 h-6 text-green-500" />,
      label: 'Contributors',
      value: metrics.totalContributors.toLocaleString(),
      change: '+3%',
      trend: 'up'
    },
    {
      icon: <Code className="w-6 h-6 text-purple-500" />,
      label: 'Lines of Code',
      value: `${Math.round(metrics.linesOfCode / 1000)}K`,
      change: '+8%',
      trend: 'up'
    },
    {
      icon: <Shield className="w-6 h-6 text-orange-500" />,
      label: 'Bus Factor',
      value: metrics.busFactor.toString(),
      change: 'Stable',
      trend: 'stable'
    },
    {
      icon: <TestTube className="w-6 h-6 text-emerald-500" />,
      label: 'Test Coverage',
      value: `${metrics.testCoverage}%`,
      change: '+2%',
      trend: 'up'
    },
    {
      icon: <Star className="w-6 h-6 text-yellow-500" />,
      label: 'Code Quality',
      value: `${metrics.codeQuality}/10`,
      change: '+0.3',
      trend: 'up'
    }
  ];

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {metricCards.map((metric, index) => (
        <div 
          key={index}
          className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-gray-50 rounded-lg">
              {metric.icon}
            </div>
            <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
              {metric.change}
            </span>
          </div>
          
          <div>
            <h4 className="text-3xl font-bold text-gray-900 mb-1">
              {metric.value}
            </h4>
            <p className="text-gray-600 text-sm">
              {metric.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsGrid;