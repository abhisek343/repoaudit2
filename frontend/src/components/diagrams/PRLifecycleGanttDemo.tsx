// Demo component to showcase the enhanced PR Lifecycle Gantt Chart
import React from 'react';
import PRLifecycleGantt from './PRLifecycleGantt';
import { PullRequestData } from '../../types/advanced';

// Sample data for demonstration
const samplePRData: PullRequestData[] = [
  {
    id: 1001,
    title: "feat: Add enhanced authentication system with 2FA support",
    author: "john.doe",
    state: "merged",
    createdAt: "2024-06-01T09:00:00Z",
    closedAt: "2024-06-05T15:30:00Z",
    mergedAt: "2024-06-05T15:30:00Z",
    timeToMergeHours: 102.5,
    timeToCloseHours: 102.5
  },
  {
    id: 1002,
    title: "fix: Resolve memory leak in data processing pipeline",
    author: "jane.smith",
    state: "merged", 
    createdAt: "2024-06-02T14:00:00Z",
    closedAt: "2024-06-04T10:15:00Z",
    mergedAt: "2024-06-04T10:15:00Z",
    timeToMergeHours: 44.25,
    timeToCloseHours: 44.25
  },
  {
    id: 1003,
    title: "refactor: Modernize React components to use hooks",
    author: "alex.dev",
    state: "open",
    createdAt: "2024-06-10T11:30:00Z",
    closedAt: null,
    mergedAt: null,
    timeToMergeHours: null,
    timeToCloseHours: null
  },
  {
    id: 1004,
    title: "docs: Update API documentation with new endpoints",
    author: "sarah.writer",
    state: "closed",
    createdAt: "2024-06-08T16:45:00Z", 
    closedAt: "2024-06-09T09:20:00Z",
    mergedAt: null,
    timeToMergeHours: null,
    timeToCloseHours: 16.58
  },
  {
    id: 1005,
    title: "feat: Implement real-time notifications",
    author: "mike.frontend",
    state: "merged",
    createdAt: "2024-06-06T08:15:00Z",
    closedAt: "2024-06-12T14:45:00Z", 
    mergedAt: "2024-06-12T14:45:00Z",
    timeToMergeHours: 150.5,
    timeToCloseHours: 150.5
  }
];

const PRLifecycleGanttDemo: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Enhanced PR Lifecycle Gantt Chart
        </h1>
        <p className="text-gray-600 max-w-2xl">
          Interactive visualization showing pull request lifecycles with phase breakdown, 
          dual view modes, and comprehensive statistics. Click on PR titles for detailed information.
        </p>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-96">
        <PRLifecycleGantt data={samplePRData} />
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">🔄 View Modes</h3>
          <p className="text-sm text-gray-600">
            Toggle between timeline view and phases view to see different perspectives of the PR lifecycle.
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">📊 Interactive Features</h3>
          <p className="text-sm text-gray-600">
            Click on PR titles to see detailed information including phase breakdown and statistics.
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">🎨 Enhanced Design</h3>
          <p className="text-sm text-gray-600">
            Professional styling with smooth animations, intuitive colors, and responsive layout.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PRLifecycleGanttDemo;
