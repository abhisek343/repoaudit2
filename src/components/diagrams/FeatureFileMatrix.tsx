import React from 'react';

interface FeatureFileMatrixProps {
  features: string[];
  files: string[];
  matrix: number[][]; // matrix[feature][file] = intensity (0-1)
  width?: number;
  height?: number;
}

const FeatureFileMatrix = ({ 
  features, 
  files, 
  matrix, 
  width = 800, 
  height = 600 
}: FeatureFileMatrixProps) => {
  const cellWidth = Math.max(20, (width - 200) / files.length);
  const cellHeight = Math.max(20, (height - 100) / features.length);

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return '#f3f4f6';
    const alpha = Math.max(0.1, intensity);
    return `rgba(59, 130, 246, ${alpha})`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full overflow-auto" style={{ width: width, height: height }}>
        {/* Feature labels */}
        <div className="absolute left-0 top-20">
          {features.map((feature, i) => (
            <div
              key={feature}
              className="text-sm font-medium text-gray-700 text-right pr-2 whitespace-nowrap"
              style={{
                height: cellHeight,
                lineHeight: `${cellHeight}px`,
                width: 180
              }}
            >
              {feature.length > 25 ? feature.substring(0, 25) + '...' : feature}
            </div>
          ))}
        </div>

        {/* File labels */}
        <div className="absolute top-0 left-48">
          {files.map((file, j) => (
            <div
              key={file}
              className="text-xs text-gray-600 absolute origin-bottom-left whitespace-nowrap"
              style={{
                left: j * cellWidth + cellWidth / 2,
                top: 15,
                transform: 'rotate(-45deg)',
                width: 100
              }}
            >
              {file.split('/').pop()?.substring(0, 15)}
            </div>
          ))}
        </div>

        {/* Matrix cells */}
        <div className="absolute top-20 left-48">
          {features.map((feature, i) => (
            <div key={feature} className="flex">
              {files.map((file, j) => {
                const intensity = matrix[i]?.[j] || 0;
                return (
                  <div
                    key={`${feature}-${file}`}
                    className="border border-gray-200 cursor-pointer hover:border-gray-400 transition-colors duration-200"
                    style={{
                      width: cellWidth,
                      height: cellHeight,
                      backgroundColor: getIntensityColor(intensity)
                    }}
                    title={`${feature} - ${file}: ${Math.round(intensity * 100)}% involvement`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
          <div className="text-sm font-medium text-gray-700 mb-2">Involvement Level</div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-200"></div>
            <span className="text-xs text-gray-600">None</span>
            <div className="w-4 h-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }}></div>
            <span className="text-xs text-gray-600">Low</span>
            <div className="w-4 h-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.7)' }}></div>
            <span className="text-xs text-gray-600">Medium</span>
            <div className="w-4 h-4" style={{ backgroundColor: 'rgba(59, 130, 246, 1)' }}></div>
            <span className="text-xs text-gray-600">High</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
        <p>Feature-to-file mapping matrix showing which files are involved in each feature. 
        Darker cells indicate higher involvement levels.</p>
      </div>
    </div>
  );
};

export default FeatureFileMatrix;