/**
 * @file Provides the main dashboard for viewing and managing analysis reports.
 *
 * This component orchestrates data fetching, state management, and rendering for the dashboard UI.
 * It follows best practices for handling asynchronous operations and state updates in React.
 */
import React from 'react';
import {
  InteractiveArchitectureVisualizations,
  SystemArchitecture,
  VulnerabilityDistribution,
  ComplexityScatterPlot,
} from './Visualizations';

/**
 * The main dashboard component for displaying and managing reports.
 */
export const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-800">Analysis Dashboard</h1>
          <p className="text-gray-600 mt-2">Advanced Software Visualizations</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-md col-span-1 md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Interactive Architecture</h2>
            <InteractiveArchitectureVisualizations />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">System Architecture</h2>
            <SystemArchitecture />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Vulnerability Distribution</h2>
            <VulnerabilityDistribution />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Complexity Scatter Plot</h2>
            <ComplexityScatterPlot />
          </div>
        </div>
      </div>
    </div>
  );
};
