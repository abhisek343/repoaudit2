import { Code2, Info, Cpu } from 'lucide-react'; // Added Info, Cpu, removed ArrowRight, GitBranch, TrendingUp
import { AnalysisResult } from '../types'; // Import AnalysisResult

interface KeyFunctionAnalysisProps {
  // Pass only the relevant part of reportData
  keyFunctions?: AnalysisResult['keyFunctions'];
}

const KeyFunctionAnalysis = ({ keyFunctions }: KeyFunctionAnalysisProps) => {
  if (!keyFunctions || keyFunctions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Code2 className="w-6 h-6 text-purple-500 mr-3" />
          Key Function Analysis
        </h3>
        <div className="text-center py-12 text-gray-500">
          <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium mb-2">No Key Functions Identified</h4>
          <p className="text-sm">
            AI-powered key function analysis was not performed or did not identify specific functions.
            This may require LLM configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Code2 className="w-6 h-6 text-purple-500 mr-3" />
        AI-Identified Key Functions & Modules
      </h3>

      <div className="space-y-6">
        {keyFunctions.map((func, index) => (
          <div key={index} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow duration-200 bg-gray-50/50">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Function Info & Explanation */}
              <div className="lg:col-span-2">
                <div className="flex items-start space-x-3 mb-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-md font-semibold text-gray-800">
                            <code className="text-purple-700 bg-purple-50 px-1 rounded">{func.name}</code>
                        </h4>
                        <p className="text-xs text-gray-500 truncate" title={func.path || func.file}>
                            In: <span className="font-mono">{func.path || func.file}</span>
                        </p>
                    </div>
                </div>

                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                  <p className="line-clamp-4" title={func.explanation}>{func.explanation}</p>
                </div>
              </div>

              {/* Complexity & Metrics */}
              <div className="lg:col-span-1">
                <h5 className="text-sm font-semibold text-gray-700 mb-2">
                  Metrics
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-white rounded-md border">
                    <span className="text-gray-600">Complexity Score:</span>
                    <span className={`font-bold ${
                      func.complexity >= 70 ? 'text-red-600' :
                      func.complexity >= 50 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {func.complexity}%
                    </span>
                  </div>
                  {func.linesOfCode && (
                    <div className="flex justify-between p-2 bg-white rounded-md border">
                        <span className="text-gray-600">Lines of Code:</span>
                        <span className="font-medium text-gray-800">{func.linesOfCode}</span>
                    </div>
                  )}
                  {func.performance && (
                     <div className="p-2 bg-white rounded-md border">
                        <p className="text-gray-600"><span className="font-medium">Est. Runtime:</span> {func.performance.estimatedRuntime}</p>
                        <p className="text-gray-600"><span className="font-medium">Big O:</span> {func.performance.complexity}</p>
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
       {keyFunctions.length === 0 && (
            <p className="text-center text-gray-500 py-5">LLM did not identify specific key functions from the provided data.</p>
        )}
    </div>
  );
};

export default KeyFunctionAnalysis;
