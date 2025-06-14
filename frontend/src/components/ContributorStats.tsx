import React from 'react';
import VisualizationErrorBoundary from './VisualizationErrorBoundary';
import { AnalysisResult } from '../types';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

interface ContributorStatsProps { reportData: AnalysisResult; }

const ContributorStatsComponent: React.FC<ContributorStatsProps> = ({ reportData }) => {
  const contributors = reportData.contributors || [];
  const commitData = contributors.map(c => ({ name: c.login, contributions: c.contributions }));

  if (contributors.length === 0) {
    return (
      <VisualizationErrorBoundary>
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-500">No contributor data available.</p>
        </div>
      </VisualizationErrorBoundary>
    );
  }

  return (
    <VisualizationErrorBoundary>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Contributor Statistics</h2>
        <div className="h-80">
          {/* Bar chart for contributions */}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={commitData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '14px' }} />
              <Bar dataKey="contributions" fill="#8884d8" name="Contributions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </VisualizationErrorBoundary>
  );
};

export default ContributorStatsComponent;
