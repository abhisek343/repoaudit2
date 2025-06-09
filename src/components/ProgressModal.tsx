import React from 'react';
import { X, AlertTriangle, Settings, Key } from 'lucide-react';

interface ProgressModalProps {
  isOpen: boolean;
  currentStep: string;
  progress: number;
  error?: string;
  onOpenSettings?: () => void;
}

const ProgressModal = ({ isOpen, currentStep, progress, error, onOpenSettings }: ProgressModalProps) => {
  if (!isOpen) return null;

  const isGitHubRateLimitError = (errorMessage?: string): boolean => {
    if (!errorMessage) return false;
    return errorMessage.includes('rate limit') || 
           errorMessage.includes('API rate limit') ||
           errorMessage.includes('Access forbidden') ||
           errorMessage.includes('configure a GitHub Personal Access Token');
  };

  const isLLMRateLimitError = (errorMessage?: string): boolean => {
    if (!errorMessage) return false;
    return errorMessage.includes('exceeded your current quota') ||
           errorMessage.includes('quota') ||
           errorMessage.includes('billing details') ||
           errorMessage.includes('rate-limits') ||
           errorMessage.includes('429');
  };

  const isRateLimitError = isGitHubRateLimitError(error) || isLLMRateLimitError(error);
  const isLLMError = isLLMRateLimitError(error);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {error ? (
          <div className="text-center">
            <div className={`p-4 rounded-full mx-auto mb-4 ${isRateLimitError ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <AlertTriangle className={`w-8 h-8 ${isRateLimitError ? 'text-yellow-600' : 'text-red-600'}`} />
            </div>
            
            <h3 className={`text-lg font-semibold mb-3 ${isRateLimitError ? 'text-yellow-800' : 'text-red-800'}`}>
              {isLLMError ? 'AI Service Quota Exceeded' : 
               isGitHubRateLimitError(error) ? 'GitHub API Rate Limit Exceeded' : 
               'Analysis Failed'}
            </h3>
            
            <p className={`text-sm mb-6 ${isRateLimitError ? 'text-yellow-700' : 'text-red-700'}`}>
              {error}
            </p>

            {isLLMError && onOpenSettings && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-left">
                      <h4 className="font-medium text-blue-900 mb-1">Solutions</h4>
                      <p className="text-sm text-blue-800 mb-3">
                        Try switching to a different AI provider or check your billing details for the current provider.
                      </p>
                      <button
                        onClick={onOpenSettings}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Open Settings
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600">
                  <p className="mb-2">
                    <strong>Options to resolve:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-left">
                    <li>Switch to a different AI provider (OpenAI, Claude, etc.)</li>
                    <li>Check your billing details for the current provider</li>
                    <li>Wait for quota reset (usually hourly/daily)</li>
                    <li>Upgrade your plan if available</li>
                  </ol>
                </div>
              </div>
            )}

            {isGitHubRateLimitError(error) && onOpenSettings && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-left">
                      <h4 className="font-medium text-blue-900 mb-1">Quick Fix</h4>
                      <p className="text-sm text-blue-800 mb-3">
                        Configure a GitHub Personal Access Token to increase your rate limit from 60 to 5,000 requests per hour.
                      </p>
                      <button
                        onClick={onOpenSettings}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Open Settings
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600">
                  <p className="mb-2">
                    <strong>Steps to fix:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-left">
                    <li>Click "Open Settings" above</li>
                    <li>Generate a GitHub token using the provided link</li>
                    <li>Paste the token and save configuration</li>
                    <li>Retry your analysis</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"
                style={{
                  transform: `rotate(${progress * 3.6}deg)`
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold text-indigo-600">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Analyzing Repository
            </h3>
            
            <p className="text-gray-600 mb-4">
              {currentStep}
            </p>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressModal;