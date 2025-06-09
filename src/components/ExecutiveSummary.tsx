import React from 'react';
import { Brain, Lightbulb } from 'lucide-react';

interface ExecutiveSummaryProps {
  repository: {
    name: string;
    fullName: string;
    description: string;
    language: string;
  };
}

const ExecutiveSummary = ({ repository }: ExecutiveSummaryProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Brain className="w-6 h-6 text-indigo-500 mr-3" />
        AI Executive Summary
      </h3>
      
      <div className="prose prose-lg max-w-none">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border-l-4 border-indigo-500">
          <p className="text-gray-800 leading-relaxed">
            This repository contains the source code for <strong>{repository.name}</strong>, a highly active and well-maintained {repository.language} project. 
            The codebase demonstrates excellent organizational patterns with clear separation of concerns and robust testing practices.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
              Key Insights
            </h4>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>High commit frequency indicates active development and maintenance</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Well-distributed contributor base reduces bus factor risk</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Core logic is well-abstracted with clear module boundaries</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Testing coverage is comprehensive across critical paths</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">
              Architecture Highlights
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                The project follows modern software engineering practices with a clear modular architecture. 
                The most complex components are concentrated in the core routing and compilation modules, 
                which show signs of careful refactoring and optimization over time.
              </p>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400">
              <p className="text-yellow-800 text-sm font-medium">
                <strong>Recommendation:</strong> Consider breaking down some of the larger modules 
                in the routing system to improve maintainability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummary;