import React from 'react';
import { useReport } from '../hooks/useReport';
import SystemArchitectureView from '../components/SystemArchitectureView';
import { AlertCircle, GitBranch } from 'lucide-react';

const SystemArchitecturePage: React.FC = () => {
  const { reportData, isLoading, error } = useReport();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system architecture analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Analysis Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }
  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No Report Available</h2>
          <p className="text-gray-600">Please run an analysis first to view system architecture.</p>
        </div>
      </div>
    );
  }

  if (!reportData.systemArchitecture) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">System Architecture Not Available</h2>
          <p className="text-yellow-700 mb-4">
            System architecture analysis was not completed for this repository. 
            This could be due to:
          </p>
          <ul className="text-left text-yellow-700 max-w-md mx-auto space-y-1">
            <li>• The repository structure wasn't suitable for architecture analysis</li>
            <li>• An error occurred during the analysis process</li>
            <li>• The feature is not enabled in the current configuration</li>
          </ul>
          <p className="text-yellow-600 mt-4 text-sm">
            Try running the analysis again or check the analysis warnings for more details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SystemArchitectureView systemArchitecture={reportData.systemArchitecture} />
    </div>
  );
};

export default SystemArchitecturePage;
