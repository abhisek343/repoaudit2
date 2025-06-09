import React from 'react';
import { Flame, FileText, AlertCircle, TrendingUp } from 'lucide-react';

interface CodeHeatmapProps {
  hotspots?: Array<{
    file: string;
    complexity: number;
    changes: number;
    explanation?: string;
    size?: number;
  }>;
}

const CodeHeatmap = ({ hotspots }: CodeHeatmapProps) => {
  // Use real data if available, otherwise show empty state
  const heatmapData = hotspots && hotspots.length > 0 ? hotspots : [];

  const getHeatColor = (complexity: number) => {
    if (complexity >= 80) return 'bg-red-500';
    if (complexity >= 60) return 'bg-orange-500';
    if (complexity >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getHeatIntensity = (complexity: number) => {
    if (complexity >= 80) return 'opacity-90';
    if (complexity >= 60) return 'opacity-70';
    if (complexity >= 40) return 'opacity-50';
    return 'opacity-30';
  };

  const getBorderColor = (complexity: number) => {
    if (complexity >= 80) return 'border-red-200 hover:border-red-400';
    if (complexity >= 60) return 'border-orange-200 hover:border-orange-400';
    if (complexity >= 40) return 'border-yellow-200 hover:border-yellow-400';
    return 'border-green-200 hover:border-green-400';
  };

  const getBackgroundColor = (complexity: number) => {
    if (complexity >= 80) return '#fef2f2';
    if (complexity >= 60) return '#fff7ed';
    if (complexity >= 40) return '#fffbeb';
    return '#f0fdf4';
  };

  if (heatmapData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Flame className="w-6 h-6 text-red-500 mr-3" />
          Code Hotspots & Complexity
        </h3>
        
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-500 mb-2">No Hotspots Analyzed</h4>
          <p className="text-gray-400">
            Configure an AI provider in settings to enable detailed code complexity analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Flame className="w-6 h-6 text-red-500 mr-3" />
        Code Hotspots & Complexity
      </h3>
      
      <p className="text-gray-600 mb-8">
        This visualization shows file complexity and potential maintenance concerns. 
        Red areas indicate high complexity files that may need attention.
      </p>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {heatmapData.map((file, index) => (
          <div 
            key={index}
            className={`relative p-6 rounded-lg border-2 transition-all duration-300 hover:scale-105 cursor-pointer ${getBorderColor(file.complexity)}`}
            style={{ 
              minHeight: '200px',
              backgroundColor: getBackgroundColor(file.complexity)
            }}
          >
            <div className={`absolute inset-0 rounded-lg ${getHeatColor(file.complexity)} ${getHeatIntensity(file.complexity)}`}></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <FileText className="w-5 h-5 text-gray-600" />
                {file.complexity >= 80 && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                {file.file.split('/').pop()}
              </h4>
              
              <div className="text-xs text-gray-700 space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Complexity:</span>
                  <span className="font-medium">{file.complexity}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Changes:</span>
                  <span className="font-medium">{file.changes}</span>
                </div>
                {file.size && (
                  <div className="flex justify-between">
                    <span>Lines:</span>
                    <span className="font-medium">{file.size}</span>
                  </div>
                )}
              </div>

              {file.explanation && (
                <div className="text-xs text-gray-600 leading-relaxed">
                  <p className="line-clamp-4">{file.explanation}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-8 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
          <span className="text-gray-600">High Risk (80%+)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
          <span className="text-gray-600">Medium Risk (60-79%)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
          <span className="text-gray-600">Low Risk (40-59%)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
          <span className="text-gray-600">Stable (&lt;40%)</span>
        </div>
      </div>
    </div>
  );
};

export default CodeHeatmap;