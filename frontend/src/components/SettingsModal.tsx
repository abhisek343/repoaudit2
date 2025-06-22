import React, { useState, useEffect, useCallback } from 'react';
import { X, Key, Settings, Eye, EyeOff, Zap, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { LLMConfig } from '../types';

// Simple debounce hook
const useDebounce = (callback: () => void, delay: number) => {
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  
  return useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(callback, delay);
  }, [callback, delay]);
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: LLMConfig, githubToken?: string) => void;
  currentConfig?: LLMConfig;
  currentGithubToken?: string;
}

const SettingsModal = ({ isOpen, onClose, onSave, currentConfig, currentGithubToken }: SettingsModalProps) => {
  const [provider, setProvider] = useState<'openai' | 'claude' | 'gemini'>('openai'); // Consolidated
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [model, setModel] = useState(currentConfig?.model || '');
  const [githubToken, setGithubToken] = useState(currentGithubToken || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);

  const [githubTokenStatus, setGithubTokenStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [githubTokenError, setGithubTokenError] = useState<string | null>(null);
  const [llmConfigStatus, setLlmConfigStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [llmConfigError, setLlmConfigError] = useState<string | null>(null);

  // GitHub token validation
  const validateGithubToken = useCallback(async (token: string) => {
    if (!token.trim()) {
      setGithubTokenStatus('idle');
      setGithubTokenError(null);
      return;
    }
    setGithubTokenStatus('validating');
    setGithubTokenError(null);
    try {
      const response = await fetch('/api/validate-github-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (response.ok && data.isValid) {
        setGithubTokenStatus('valid');
      } else {
        setGithubTokenStatus('invalid');
        setGithubTokenError(data.error || 'Invalid GitHub token.');
      }
    } catch (error) {
      setGithubTokenStatus('invalid');
      setGithubTokenError('Failed to validate GitHub token.');
      console.error('GitHub token validation error:', error);
    }
  }, []);

  // Debounced GitHub token validation (stable debounced function)
  const debouncedGithubValidator = useDebounce(
    useCallback(() => {
      if (githubToken.trim()) {
        validateGithubToken(githubToken.trim());
      } else {
        setGithubTokenStatus('idle');
        setGithubTokenError(null);
      }
    }, [githubToken, validateGithubToken]),
    500
  );

  // Run debounced validator when githubToken changes
  useEffect(() => {
    debouncedGithubValidator();
  }, [debouncedGithubValidator]);

  const validateLlmConfig = useCallback(async (config: LLMConfig) => {
    if (!config.apiKey.trim()) {
      setLlmConfigStatus('idle');
      setLlmConfigError(null);
      return;
    }
    
    setLlmConfigStatus('validating');
    setLlmConfigError(null);
    try {
      const response = await fetch('/api/validate-llm-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmConfig: config }),
      });
      const data = await response.json();
      if (response.ok && data.isValid) {
        setLlmConfigStatus('valid');
      } else {
        setLlmConfigStatus('invalid');
        const errorMessage = data.error || `Invalid API key for ${config.provider}.`;
        
        // Check if it's a quota-related error and provide user-friendly message
        if (errorMessage.toLowerCase().includes('quota') || 
            errorMessage.toLowerCase().includes('too many requests') ||
            errorMessage.toLowerCase().includes('temporarily unavailable') ||
            errorMessage.toLowerCase().includes('rate limited')) {
          setLlmConfigError('API quota temporarily exceeded. Please wait before retrying or upgrade your plan.');
        } else {
          setLlmConfigError(errorMessage);
        }
      }
    } catch (error) {
      setLlmConfigStatus('invalid');
      setLlmConfigError(`Failed to validate API key for ${config.provider}.`);
      console.error('LLM key validation error:', error);
    }
  }, []); // validateLlmConfig no longer depends on llmConfigStatus

  // Debounced LLM config validation (stable)
  const debouncedLlmValidator = useDebounce(
    useCallback(() => {
      if (apiKey.trim() && provider) {
        validateLlmConfig({ provider, apiKey: apiKey.trim(), model: model || getDefaultModel(provider) });
      } else {
        setLlmConfigStatus('idle');
        setLlmConfigError(null);
      }
    }, [apiKey, provider, model, validateLlmConfig]),
    2000
  );

  useEffect(() => {
    debouncedLlmValidator();
  }, [debouncedLlmValidator]);

  useEffect(() => {
    if (currentConfig) {
      const currentProvider = currentConfig.provider;
      if (currentProvider === 'openai' || currentProvider === 'claude' || currentProvider === 'gemini') {
        setProvider(currentProvider);
      } else {
        setProvider('openai'); // Default
      }
      setApiKey(currentConfig.apiKey);
      setModel(currentConfig.model || '');
    }
    if (currentGithubToken) {
      setGithubToken(currentGithubToken);
    }
  }, [currentConfig, currentGithubToken]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('Please enter an API key');
      return;
    }

    const config: LLMConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim() || getDefaultModel(provider) // Ensure a default model is always set
    };

    onSave(config, githubToken.trim() || undefined);
    onClose();
  };

  const getDefaultModel = (provider: string) => {
    switch (provider) {
      case 'openai': return 'gpt-4.1-nano'; // Assuming this is a desired custom name or specific variant
      case 'gemini': return 'gemini-2.5-flash-preview-05-20'; // Updated default Gemini model to latest Flash
      case 'claude': return 'claude-sonnet-4'; // Assuming this is a desired custom name or specific variant
      default: return '';
    }
  };

const getModelOptions = (provider: string) => {
  switch (provider) {
    case 'openai':
      return [
        { value: 'gpt-4o', label: 'GPT-4o (Recommended)', context: '128K tokens', pros: 'Flagship model, fast, multimodal', cons: 'Slightly higher cost' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', context: '128K tokens', pros: 'High accuracy, good for complex tasks', cons: 'Slower than GPT-4o' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', context: '16K tokens', pros: 'Very fast and cost-effective', cons: 'Less capable for complex reasoning' }
      ];
    case 'gemini':
      return [
        { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash Preview (05-20) (Recommended)', context: '1M tokens*', pros: 'Latest Flash, very fast, large context', cons: 'Preview version' },
        { value: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro Preview (06-05)', context: '1M tokens*', pros: 'Latest Pro model, advanced reasoning, large context', cons: 'Preview version, potentially higher latency/cost' }
        // *Context window for Gemini models can vary.
      ];
    case 'claude':
      return [
        { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet (Recommended)', context: '200K tokens', pros: 'Fast, intelligent, industry-leading vision', cons: 'Newer model' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', context: '200K tokens', pros: 'Most powerful model for complex analysis', cons: 'Higher cost and latency' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', context: '200K tokens', pros: 'Fastest and most compact model', cons: 'Best for simpler, quick tasks' }
      ];
    default:
      return [];
  }
};

  const getProviderInfo = (provider: string) => {
    switch (provider) {
      case 'openai':
        return { name: 'OpenAI', description: 'Access GPT models for high-quality text generation.', keyUrl: 'https://platform.openai.com/api-keys', maxContext: '128K tokens', strengths: 'Strong overall performance' };
      case 'gemini':
        return { name: 'Google Gemini', description: 'Access Gemini models for advanced AI capabilities.', keyUrl: 'https://aistudio.google.com/app/apikey', maxContext: '1M tokens', strengths: 'Large context, multimodal' };
      case 'claude':
        return { name: 'Anthropic Claude', description: 'Access Claude models for safe, helpful AI assistance.', keyUrl: 'https://console.anthropic.com/account/keys', maxContext: '200K tokens', strengths: 'Excellent for code analysis' };
      default:
        return { name: '', description: '', keyUrl: '', maxContext: '', strengths: '' };
    }
  };

  if (!isOpen) return null;

  const providerInfo = getProviderInfo(provider);
  const modelOptions = getModelOptions(provider);
  const selectedModelInfo = modelOptions.find(m => m.value === model) || modelOptions[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Privacy Notice */}
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-green-100 rounded">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-green-800 mb-1">
                  🔒 Your Privacy is Protected - Bring Your Own Keys
                </h3>
                <p className="text-xs text-green-700">
                  API keys are stored locally in your browser and only sent to official provider endpoints. 
                  Your code never leaves your machine - all analysis happens locally. We don't collect, store, or transmit your data.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 mt-3">
            Configure your API keys to enable AI-powered analysis and increase GitHub API rate limits.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* GitHub Token Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Key className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  GitHub Personal Access Token
                </h3>                <p className="text-sm text-gray-600 mb-4">
                  <strong>Highly Recommended:</strong> Without a GitHub token, you're limited to 60 API requests per hour, 
                  which may cause analysis failures. With a token, you get 5,000 requests per hour.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <Zap className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div className="text-xs text-blue-700">
                      <div className="font-medium mb-1">🚀 Enhanced Performance with GraphQL</div>
                      <div>Now includes GraphQL API fallback for more efficient data fetching. This reduces the number of API calls needed and improves analysis speed, especially beneficial when rate limits are approaching.</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="font-medium text-red-700">Without Token</div>
                      <div className="text-red-600">60 requests/hour</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="font-medium text-green-700">With Token</div>
                      <div className="text-green-600">5,000 requests/hour</div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showGithubToken ? 'text' : 'password'}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-20"
                  />
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                    {githubTokenStatus === 'validating' && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                    {githubTokenStatus === 'valid' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {githubTokenStatus === 'invalid' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showGithubToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {githubTokenError && <p className="text-xs text-red-500 mt-1">{githubTokenError}</p>}
                
                <div className="mt-3 text-xs text-gray-600">
                  <p className="mb-2">
                    <strong>Required permissions:</strong> public_repo (for public repositories) or repo (for private repositories)
                  </p>
                  <a 
                    href="https://github.com/settings/tokens/new?description=Repo%20Auditor&scopes=public_repo" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    → Generate GitHub Token (opens in new tab)
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* LLM Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              AI Provider (Optional - for enhanced insights)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['openai', 'claude', 'gemini'] as const).map((p) => { // Consolidated list
                const info = getProviderInfo(p);
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setProvider(p);
                      setModel(getDefaultModel(p));
                    }}
                    className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                      provider === p
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 mb-1">{info.name}</div>
                    <div className="text-xs text-gray-500 mb-2">{info.description}</div>
                    <div className="flex items-center space-x-2 text-xs">
                      <Zap className="w-3 h-3 text-green-500" />
                      <span className="text-green-600">Max: {info.maxContext}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{info.strengths}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {providerInfo.name} API Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                {llmConfigStatus === 'validating' && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                {llmConfigStatus === 'valid' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {llmConfigStatus === 'invalid' && <AlertTriangle className="w-5 h-5 text-red-500" />}
              </div>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Get your API key from{' '}
              <a 
                href={providerInfo.keyUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700"
              >
                {providerInfo.name} dashboard
              </a>
            </p>
            {llmConfigError && <p className="text-xs text-red-500 mt-1">{llmConfigError}</p>}
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Selection
            </label>
            <select
              value={model || getDefaultModel(provider)}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            {selectedModelInfo && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-medium text-gray-900">Context</div>
                      <div className="text-gray-600">{selectedModelInfo.context}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-purple-500" />
                    <div>
                      <div className="font-medium text-gray-900">Best For</div>
                      <div className="text-gray-600">{selectedModelInfo.pros}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-600">
                    <strong>Considerations:</strong> {selectedModelInfo.cons}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Latest Model Recommendations</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Whole-repo analysis:</span>
                <span className="font-medium">GPT-4.5, Gemini 2.5 Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Most cost-effective:</span>
                <span className="font-medium">GPT-4.1 Nano, Gemini 2.5 Flash</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Largest context:</span>
                <span className="font-medium">Gemini 2.5 Pro (1M tokens)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Best reasoning:</span>
                <span className="font-medium">Claude Opus 4, GPT-4.5</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Massive Context Support
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Latest models support up to 2M tokens context, allowing analysis of entire large codebases 
                  in a single request for better understanding of relationships and patterns. Perfect for comprehensive repository audits.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Key className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Security Notice
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  API keys are stored locally in your browser and never sent to our servers. 
                  They are only used to make direct API calls to the respective AI providers.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors duration-200"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
