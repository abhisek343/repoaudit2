import React from 'react';
import ContributorStatsComponent from '../components/ContributorStats';

const ContributorStatsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Contributor Statistics</h1>
      <ContributorStatsComponent />
    </div>
  );
};

export default ContributorStatsPage; 