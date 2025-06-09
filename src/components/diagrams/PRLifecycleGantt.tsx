import React from 'react';
import { Calendar, Clock, GitPullRequest, CheckCircle } from 'lucide-react';

interface PRPhase {
  name: string;
  duration: number; // in hours
  color: string;
  icon: React.ReactNode;
}

interface PRLifecycleGanttProps {
  phases: PRPhase[];
  totalDuration: number;
  width?: number;
  height?: number;
}

const PRLifecycleGantt = ({ 
  phases, 
  totalDuration, 
  width = 800, 
  height = 300 
}: PRLifecycleGanttProps) => {
  const barHeight = 40;
  const margin = { top: 40, right: 40, bottom: 60, left: 150 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  let currentPosition = 0;

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white rounded-lg border border-gray-200 p-4" style={{ width, height }}>
        {/* Title */}
        <div className="flex items-center justify-center mb-4">
          <GitPullRequest className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Typical PR Lifecycle</h3>
        </div>

        {/* Chart */}
        <div className="relative" style={{ marginLeft: margin.left, marginTop: margin.top }}>
          {/* Time axis */}
          <div className="absolute top-0 left-0 right-0 h-6 border-b border-gray-300">
            {[0, 25, 50, 75, 100].map(percent => (
              <div
                key={percent}
                className="absolute top-0 h-6 border-l border-gray-300"
                style={{ left: `${(percent / 100) * chartWidth}px` }}
              >
                <span className="absolute -bottom-6 -left-4 text-xs text-gray-600">
                  {Math.round((percent / 100) * totalDuration)}h
                </span>
              </div>
            ))}
          </div>

          {/* Phases */}
          <div className="mt-8">
            {phases.map((phase, index) => {
              const phaseWidth = (phase.duration / totalDuration) * chartWidth;
              const phaseElement = (
                <div key={index} className="relative mb-2">
                  {/* Phase label */}
                  <div className="absolute -left-36 top-0 flex items-center h-10">
                    <div className="flex items-center space-x-2">
                      {phase.icon}
                      <span className="text-sm font-medium text-gray-700">{phase.name}</span>
                    </div>
                  </div>

                  {/* Phase bar */}
                  <div
                    className="h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm"
                    style={{
                      backgroundColor: phase.color,
                      width: `${phaseWidth}px`,
                      marginLeft: `${currentPosition}px`
                    }}
                  >
                    {phase.duration}h
                  </div>
                </div>
              );

              currentPosition += phaseWidth;
              return phaseElement;
            })}
          </div>

          {/* Total duration indicator */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Total Duration: {totalDuration} hours</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>~{Math.round(totalDuration / 8)} business days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {phases.map((phase, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: phase.color }}
            ></div>
            <span className="text-gray-700">{phase.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
        <p>Gantt chart showing the typical lifecycle of a pull request from creation to merge. 
        Each phase represents average time spent in that stage.</p>
      </div>
    </div>
  );
};

export default PRLifecycleGantt;