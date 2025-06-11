import React from 'react';
import { Flame, FileText, Info } from 'lucide-react'; // Added Info, removed AlertCircle, TrendingUp

interface HotspotData { // Define a more specific type for this component
    file: string; // short name
    path: string; // full path
    complexity: number;
    changes: number;
    explanation?: string;
    size?: number; // lines of code or file size
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface CodeHeatmapProps {
  hotspots?: HotspotData[];
}

const CodeHeatmap = ({ hotspots }: CodeHeatmapProps) => {
  const heatmapData = hotspots && hotspots.length > 0 ? hotspots : [];

  const getHeatColorClass = (riskLevel: HotspotData['riskLevel']): string => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-600 border-red-700';
      case 'high': return 'bg-red-500 border-red-600';
      case 'medium': return 'bg-orange-500 border-orange-600';
      case 'low': return 'bg-yellow-400 border-yellow-500';
      default: return 'bg-gray-400 border-gray-500';
    }
  };
  
  const getHeatBackgroundClass = (riskLevel: HotspotData['riskLevel']): string => {
     switch (riskLevel) {
      case 'critical': return 'bg-red-50 hover:border-red-400';
      case 'high': return 'bg-red-50 hover:border-red-400';
      case 'medium': return 'bg-orange-50 hover:border-orange-400';
      case 'low': return 'bg-yellow-50 hover:border-yellow-400';
      default: return 'bg-gray-50 hover:border-gray-400';
    }
  };

  const getRiskTextColor = (riskLevel: HotspotData['riskLevel']): string => {
    switch (riskLevel) {
      case 'critical': return 'text-red-700';
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };


  if (heatmapData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Flame className="w-6 h-6 text-red-500 mr-3" />
          Code Hotspots & Complexity
        </h3>
        <div className="text-center py-12 text-gray-500">
          <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium mb-2">No Hotspot Data</h4>
          <p className="text-sm">
            Hotspots analysis might not have been run or no significant hotspots were identified.
            Ensure LLM is configured for deep analysis if expected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        <Flame className="w-6 h-6 text-red-500 mr-3" />
        Code Hotspots & Complexity
      </h3>
      <p className="text-gray-600 mb-8 text-sm">
        Files identified as hotspots due to high complexity, frequent changes, or potential risk. 
        These areas might warrant closer inspection or refactoring.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {heatmapData.slice(0, 9).map((file, index) => ( // Display up to 9 hotspots
          <div 
            key={index}
            className={`relative p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${getHeatBackgroundClass(file.riskLevel)}`}
            title={file.path}
          >
            <div className={`absolute top-3 right-3 px-2 py-0.5 text-xs font-semibold rounded-full text-white ${getHeatColorClass(file.riskLevel)}`}>
              {file.riskLevel.toUpperCase()}
            </div>
            
            <div className="flex items-start space-x-3 mb-3">
                <div className={`p-2 rounded-lg ${getHeatColorClass(file.riskLevel)} bg-opacity-20`}>
                     <FileText className={`w-5 h-5 ${getRiskTextColor(file.riskLevel)}`} />
                </div>
                <div>
                    <h4 className="font-semibold text-gray-800 text-sm truncate" title={file.file}>
                        {file.file}
                    </h4>
                    <p className="text-xs text-gray-500 truncate" title={file.path}>{file.path}</p>
                </div>
            </div>
            
            <div className="text-xs text-gray-700 space-y-1.5 mb-3">
              <div className="flex justify-between">
                <span>Complexity:</span>
                <span className={`font-medium ${getRiskTextColor(file.riskLevel)}`}>{file.complexity}%</span>
              </div>
              <div className="flex justify-between">
                <span>Recent Changes:</span>
                <span className="font-medium">{file.changes}</span>
              </div>
              {file.size && (
                <div className="flex justify-between">
                  <span>Lines of Code:</span>
                  <span className="font-medium">{file.size}</span>
                </div>
              )}
            </div>

            {file.explanation && (
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3" title={file.explanation}>
                <strong>AI Note:</strong> {file.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      {heatmapData.length > 9 && (
        <p className="text-center text-sm text-gray-500 mt-6">
            Displaying top 9 hotspots. {heatmapData.length - 9} more found.
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <LegendItem colorClass="bg-red-600" label="Critical Risk" />
        <LegendItem colorClass="bg-red-500" label="High Risk" />
        <LegendItem colorClass="bg-orange-500" label="Medium Risk" />
        <LegendItem colorClass="bg-yellow-400" label="Low Risk" />
      </div>
    </div>
  );
};

const LegendItem: React.FC<{colorClass: string; label: string}> = ({colorClass, label}) => (
    <div className="flex items-center">
        <div className={`w-3.5 h-3.5 ${colorClass} rounded-sm mr-2`}></div>
        <span className="text-gray-600">{label}</span>
    </div>
);

export default CodeHeatmap;
