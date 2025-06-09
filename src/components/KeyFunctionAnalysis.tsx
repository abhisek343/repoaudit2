import React from 'react';
import { Code2, ArrowRight, GitBranch, TrendingUp } from 'lucide-react';

interface KeyFunctionAnalysisProps {
  keyFunctions?: Array<{
    name: string;
    file: string;
    explanation: string;
    complexity: number;
  }>;
}

const KeyFunctionAnalysis = ({ keyFunctions }: KeyFunctionAnalysisProps) => {
  if (!keyFunctions || keyFunctions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Code2 className="w-6 h-6 text-purple-500 mr-3" />
          Key Function Analysis
        </h3>

        <div className="text-center py-12">
          <Code2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-500 mb-2">No Functions Analyzed</h4>
          <p className="text-gray-400">
            Configure an AI provider in settings to enable detailed function analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Code2 className="w-6 h-6 text-purple-500 mr-3" />
        Key Function Analysis
      </h3>

      <div className="space-y-8">
        {keyFunctions.map((func, index) => (
          <div key={index} className="border border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors duration-200">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Function Description */}
              <div>
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border-l-4 border-purple-500">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    <code className="text-purple-600">{func.name}</code>
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    in <span className="font-mono text-gray-800">{func.file}</span>
                  </p>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-600">Complexity:</span>
                      <span className={`ml-2 font-semibold ${
                        func.complexity >= 70 ? 'text-red-600' :
                        func.complexity >= 50 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {func.complexity}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none">
                  <h5 className="font-semibold text-gray-900 mb-3">AI Analysis:</h5>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {func.explanation}
                  </div>
                </div>
              </div>

              {/* Complexity Visualization */}
              <div>
                <h5 className="text-lg font-semibold text-gray-900 mb-4">
                  Complexity Breakdown
                </h5>
                
                <div className="space-y-4">
                  {/* Complexity Score */}
                  <div className="relative">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Overall Complexity</span>
                      <span className="font-semibold">{func.complexity}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          func.complexity >= 70 ? 'bg-red-500' :
                          func.complexity >= 50 ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${func.complexity}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className={`p-4 rounded-lg border-l-4 ${
                    func.complexity >= 70 ? 'bg-red-50 border-red-400' :
                    func.complexity >= 50 ? 'bg-yellow-50 border-yellow-400' :
                    'bg-green-50 border-green-400'
                  }`}>
                    <h6 className={`font-medium mb-2 ${
                      func.complexity >= 70 ? 'text-red-800' :
                      func.complexity >= 50 ? 'text-yellow-800' :
                      'text-green-800'
                    }`}>
                      {func.complexity >= 70 ? 'High Complexity' :
                       func.complexity >= 50 ? 'Medium Complexity' :
                       'Low Complexity'}
                    </h6>
                    <p className={`text-sm ${
                      func.complexity >= 70 ? 'text-red-700' :
                      func.complexity >= 50 ? 'text-yellow-700' :
                      'text-green-700'
                    }`}>
                      {func.complexity >= 70 ? 
                        'This function may benefit from refactoring to improve maintainability.' :
                       func.complexity >= 50 ? 
                        'Consider monitoring this function for potential improvements.' :
                        'This function appears well-structured and maintainable.'}
                    </p>
                  </div>

                  {/* Simple Flow Diagram */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h6 className="font-medium text-gray-900 mb-3">Function Flow</h6>
                    <div className="space-y-3">
                      <div className="flex items-center p-2 bg-white rounded-lg shadow-sm">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                          1
                        </div>
                        <span className="text-sm text-gray-800">Input Processing</span>
                      </div>
                      
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>

                      <div className="flex items-center p-2 bg-white rounded-lg shadow-sm">
                        <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                          2
                        </div>
                        <span className="text-sm text-gray-800">Core Logic</span>
                      </div>

                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>

                      <div className="flex items-center p-2 bg-white rounded-lg shadow-sm">
                        <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                          3
                        </div>
                        <span className="text-sm text-gray-800">Return Result</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyFunctionAnalysis;