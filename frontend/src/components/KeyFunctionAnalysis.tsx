import { Code2, Info, Cpu, Zap, ChevronDown, ChevronUp, FileText, ArrowRightLeft } from 'lucide-react';
import { KeyFunction } from '../types';
import { useState } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import ts from 'react-syntax-highlighter/dist/cjs/languages/prism/typescript';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

SyntaxHighlighter.registerLanguage('typescript', ts);

interface KeyFunctionAnalysisProps {
  keyFunctions?: KeyFunction[]; // Use the expanded KeyFunction type
}

const FunctionSignature: React.FC<{ func: KeyFunction }> = ({ func }) => {
  const paramsString = func.parameters?.map(p => {
    let paramStr = p.name;
    if (p.type) paramStr += `: ${p.type}`;
    if (p.optional) paramStr += '?';
    if (p.initializer) paramStr += ` = ${p.initializer}`;
    return paramStr;
  }).join(', ') || '';

  return (
    <span className="font-mono text-xs md:text-sm break-all">
      {func.visibility && func.visibility !== 'public' && <span className="text-blue-500">{func.visibility} </span>}
      {func.isAsync && <span className="text-purple-500">async </span>}
      <span className="text-gray-700">function </span>
      <span className="text-indigo-600 font-semibold">{func.name}</span>
      <span className="text-gray-600">({paramsString})</span>
      {func.returnType && <span className="text-gray-600">: <span className="text-teal-600">{func.returnType}</span></span>}
    </span>
  );
};

const KeyFunctionCard: React.FC<{ func: KeyFunction }> = ({ func }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl p-4 md:p-5 hover:shadow-lg transition-shadow duration-200 bg-gray-50/50">
      <div className="grid lg:grid-cols-3 gap-x-6 gap-y-4">
        {/* Function Info & Explanation */}
        <div className="lg:col-span-2">
          <div className="flex items-start space-x-3 mb-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg flex-shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base md:text-md font-semibold text-gray-800">
                <FunctionSignature func={func} />
              </h4>
              <p className="text-xs text-gray-500 truncate" title={func.file}>
                In: <span className="font-mono">{func.file}</span>
                {func.startLine && func.endLine && ` (L${func.startLine}-L${func.endLine})`}
              </p>
            </div>
          </div>

          {func.explanation && (
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-3">
              <p className="line-clamp-3" title={func.explanation}>{func.explanation}</p>
            </div>
          )}
        </div>

        {/* Metrics & Quick Info */}
        <div className="lg:col-span-1">
          <h5 className="text-xs font-semibold text-gray-700 mb-1 md:mb-2">
            Quick Metrics
          </h5>
          <div className="space-y-1 md:space-y-2 text-xs">
            <div className="flex justify-between items-center p-1.5 md:p-2 bg-white rounded-md border">
              <span className="text-gray-600">Complexity:</span>
              <span className={`font-bold ${
                (func.complexity ?? 0) >= 20 ? 'text-red-600' :
                (func.complexity ?? 0) >= 10 ? 'text-orange-600' :
                'text-green-600'
              }`}>
                {func.complexity ?? 0}
              </span>
            </div>
            {func.sloc !== undefined && (
              <div className="flex justify-between items-center p-1.5 md:p-2 bg-white rounded-md border">
                <span className="text-gray-600">SLOC:</span>
                <span className="font-medium text-gray-800">{func.sloc}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Details Section */}
      <div className="mt-3 md:mt-4">
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center w-full text-left py-1.5 px-2 rounded-md hover:bg-indigo-50 transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4 mr-1.5" /> : <ChevronDown className="w-4 h-4 mr-1.5" />}
          {isExpanded ? 'Hide Details' : 'Show More Details'}
        </button>

        {isExpanded && (
          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200 text-xs md:text-sm">
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <h6 className="font-semibold text-gray-700 mb-1.5 flex items-center">
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Called Functions/Methods
                </h6>
                {func.calls && func.calls.length > 0 ? (
                  <ul className="list-disc list-inside pl-1 space-y-0.5 max-h-32 overflow-y-auto bg-white p-2 rounded-md border">
                    {func.calls.map((call, idx) => (
                      <li key={idx} className="font-mono text-gray-600 truncate" title={call}>{call}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No specific calls identified.</p>
                )}
              </div>
              
              <div>
                <h6 className="font-semibold text-gray-700 mb-1.5 flex items-center">
                  <Zap className="w-3.5 h-3.5 mr-1.5 text-yellow-500" /> Properties
                </h6>
                <div className="space-y-1 bg-white p-2 rounded-md border">
                  {func.isAsync !== undefined && <p><span className="font-medium">Async:</span> {func.isAsync ? 'Yes' : 'No'}</p>}
                  {func.visibility && <p><span className="font-medium">Visibility:</span> {func.visibility}</p>}
                  {/* Add more properties if needed */}
                </div>
              </div>
            </div>

            {func.content && (
              <div className="mt-3 md:mt-4">
                <button 
                  onClick={() => setShowCode(!showCode)}
                  className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center w-full text-left py-1.5 px-2 rounded-md hover:bg-green-50 transition-colors mb-1.5"
                >
                  {showCode ? <ChevronUp className="w-4 h-4 mr-1.5" /> : <ChevronDown className="w-4 h-4 mr-1.5" />}
                  {showCode ? 'Hide Code' : 'View Source Code'}
                  <FileText className="w-3.5 h-3.5 ml-auto opacity-70" />
                </button>
                {showCode && (
                  <div className="rounded-md overflow-hidden border border-gray-300 max-h-96 overflow-y-auto">
                    
                    <SyntaxHighlighter language="typescript" style={oneDark} customStyle={{ margin: 0, fontSize: '0.8rem' }} showLineNumbers lineNumberStyle={{opacity: 0.5}} wrapLines={true}>
                      {func.content}
                    </SyntaxHighlighter>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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
        <Cpu className="w-7 h-7 text-purple-500 mr-3" /> {/* Updated Icon */}
        Key Function Analysis
      </h3>

      <div className="space-y-4 md:space-y-6">
        {keyFunctions.map((func, index) => (
          <KeyFunctionCard key={index} func={func} />
        ))}
      </div>
       {/* Removed redundant empty state message, handled by the top-level check */}
    </div>
  );
};

export default KeyFunctionAnalysis;
