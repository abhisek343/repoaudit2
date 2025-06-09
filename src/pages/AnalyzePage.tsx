import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  Github, 
  Zap, 
  Shield, 
  TrendingUp, 
  Code, 
  Users,
  BookOpen,
  Settings,
  ArrowRight,
  CheckCircle,
  Home,
  BarChart3,
  AlertTriangle,
  Key
} from 'lucide-react';
import SettingsModal from '../components/SettingsModal';
import ProgressModal from '../components/ProgressModal';
import { AnalysisService } from '../services/analysisService';
import { LLMConfig, ReportCategory } from '../types';

const AnalyzePage = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('comprehensive');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [llmConfig, setLlmConfig] = useState<LLMConfig | undefined>();
  const [githubToken, setGithubToken] = useState<string | undefined>();
  const navigate = useNavigate();

  const reportCategories: ReportCategory[] = [
    {
      id: 'comprehensive',
      name: 'Comprehensive Analysis',
      description: 'Complete audit with all features including AI insights, security analysis, and performance metrics',
      icon: 'BarChart3',
      features: [
        'AI Executive Summary',
        'Code Architecture Analysis',
        'Security Vulnerability Scan',
        'Performance Metrics',
        'Technical Debt Assessment',
        'Contributor Analysis',
        'Refactoring Roadmap'
      ],
      requiredPlan: 'free'
    },
    {
      id: 'security',
      name: 'Security Audit',
      description: 'Focus on security vulnerabilities, secret detection, and compliance analysis',
      icon: 'Shield',
      features: [
        'Vulnerability Detection',
        'Secret Scanning',
        'Dependency Security',
        'Configuration Analysis',
        'Compliance Checks',
        'Security Recommendations'
      ],
      requiredPlan: 'free'
    },
    {
      id: 'performance',
      name: 'Performance Analysis',
      description: 'Analyze code complexity, algorithmic efficiency, and performance bottlenecks',
      icon: 'TrendingUp',
      features: [
        'Algorithmic Complexity (Big O)',
        'Performance Hotspots',
        'Memory Usage Analysis',
        'Optimization Suggestions',
        'Benchmark Comparisons'
      ],
      requiredPlan: 'free'
    },
    {
      id: 'architecture',
      name: 'Architecture Review',
      description: 'Deep dive into code structure, patterns, and architectural decisions',
      icon: 'Code',
      features: [
        'Architecture Pattern Detection',
        'Code Organization Analysis',
        'Dependency Mapping',
        'Design Pattern Usage',
        'Modularity Assessment',
        'API Design Review'
      ],
      requiredPlan: 'free'
    },
    {
      id: 'team',
      name: 'Team Dynamics',
      description: 'Analyze contributor patterns, knowledge distribution, and collaboration metrics',
      icon: 'Users',
      features: [
        'Contributor Analysis',
        'Knowledge Silos Detection',
        'Bus Factor Assessment',
        'Review Process Analysis',
        'Team Velocity Metrics'
      ],
      requiredPlan: 'free'
    },
    {
      id: 'onboarding',
      name: 'Developer Onboarding',
      description: 'Generate comprehensive guides for new contributors and maintainers',
      icon: 'BookOpen',
      features: [
        'Getting Started Guide',
        'Architecture Documentation',
        'Contribution Guidelines',
        'Quick Win Identification',
        'Learning Path Creation'
      ],
      requiredPlan: 'free'
    }
  ];

  React.useEffect(() => {
    // Load saved configuration
    const savedLlmConfig = localStorage.getItem('llmConfig');
    const savedGithubToken = localStorage.getItem('githubToken');
    
    if (savedLlmConfig) {
      try {
        setLlmConfig(JSON.parse(savedLlmConfig));
      } catch (error) {
        console.error('Failed to parse saved LLM config:', error);
      }
    }
    
    if (savedGithubToken) {
      setGithubToken(savedGithubToken);
    }
  }, []);

  const handleSettingsSave = (config: LLMConfig, token?: string) => {
    setLlmConfig(config);
    setGithubToken(token);
    
    localStorage.setItem('llmConfig', JSON.stringify(config));
    if (token) {
      localStorage.setItem('githubToken', token);
    } else {
      localStorage.removeItem('githubToken');
    }
  };

  const isGitHubRateLimitError = (errorMessage: string): boolean => {
    return errorMessage.includes('rate limit') || 
           errorMessage.includes('API rate limit') ||
           errorMessage.includes('Access forbidden') ||
           errorMessage.includes('configure a GitHub Personal Access Token');
  };

  const isLLMRateLimitError = (errorMessage: string): boolean => {
    return errorMessage.includes('exceeded your current quota') ||
           errorMessage.includes('quota') ||
           errorMessage.includes('billing details') ||
           errorMessage.includes('rate-limits') ||
           errorMessage.includes('429');
  };

  const formatLLMError = (errorMessage: string, provider?: string): string => {
    if (isLLMRateLimitError(errorMessage)) {
      // Extract the provider from the error or use the configured one
      let detectedProvider = provider || llmConfig?.provider || 'AI service';
      
      if (errorMessage.includes('GoogleGenerativeAI') || errorMessage.includes('generativelanguage.googleapis.com')) {
        detectedProvider = 'Google AI (Gemini)';
      } else if (errorMessage.includes('OpenAI')) {
        detectedProvider = 'OpenAI';
      } else if (errorMessage.includes('Anthropic') || errorMessage.includes('Claude')) {
        detectedProvider = 'Anthropic (Claude)';
      }

      return `${detectedProvider} quota exceeded. Please check your billing details, switch to a different AI provider, or wait for quota reset.`;
    }
    return errorMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    setIsAnalyzing(true);
    setError(undefined);
    setProgress(0);
    setCurrentStep('Initializing analysis...');

    try {
      const analysisService = new AnalysisService(githubToken, llmConfig);
      
      const result = await analysisService.analyzeRepository(
        githubUrl,
        (step: string, progressValue: number) => {
          setCurrentStep(step);
          setProgress(progressValue);
        }
      );

      // Store the result for the report page
      const reportId = Date.now().toString();
      localStorage.setItem(`report_${reportId}`, JSON.stringify({
        ...result,
        category: selectedCategory,
        createdAt: new Date().toISOString()
      }));
      
      setTimeout(() => {
        setIsAnalyzing(false);
        navigate(`/report/${reportId}`);
      }, 1000);

    } catch (error) {
      console.error('Analysis failed:', error);
      let errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      
      // Don't wrap GitHub API errors or LLM quota errors with "Analysis failed:" prefix
      const isGitHubError = isGitHubRateLimitError(errorMessage);
      const isLLMError = isLLMRateLimitError(errorMessage);
      
      if (isLLMError) {
        // Format LLM errors to be more user-friendly
        errorMessage = formatLLMError(errorMessage, llmConfig?.provider);
      } else if (!isGitHubError && 
          !errorMessage.startsWith('GitHub API') && 
          !errorMessage.startsWith('Repository not found')) {
        errorMessage = `Analysis failed: ${errorMessage}`;
      }
      
      setError(errorMessage);
      
      // Auto-clear error with appropriate timing based on error type
      let clearDelay = 8000; // Default for general errors
      if (isGitHubError) {
        clearDelay = 15000; // Longer for GitHub rate limits
      } else if (isLLMError) {
        clearDelay = 20000; // Longest for LLM quota errors (more complex to resolve)
      }
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setError(undefined);
      }, clearDelay);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      BarChart3: <BarChart3 className="w-6 h-6" />,
      Shield: <Shield className="w-6 h-6" />,
      TrendingUp: <TrendingUp className="w-6 h-6" />,
      Code: <Code className="w-6 h-6" />,
      Users: <Users className="w-6 h-6" />,
      BookOpen: <BookOpen className="w-6 h-6" />
    };
    return icons[iconName] || <BarChart3 className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
                <Github className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Repo Auditor</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                title="Configure API Keys"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
              <Github className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Analyze Repository
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Choose your analysis type and get comprehensive insights into any GitHub repository
          </p>

          {/* Configuration Status */}
          {githubToken ? (
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4 mr-2" />
              GitHub Token Configured (5,000 requests/hour)
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Limited to 60 requests/hour without GitHub token
              </div>
              <div className="text-sm text-gray-600">
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center"
                >
                  <Key className="w-4 h-4 mr-1" />
                  Configure GitHub token for better reliability
                </button>
              </div>
            </div>
          )}

          {llmConfig && (
            <div className="mt-3 inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4 mr-2" />
              AI Analysis Ready ({llmConfig.provider})
            </div>
          )}
        </div>

        {/* Analysis Type Selection */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Choose Analysis Type
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedCategory === category.id
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`p-3 rounded-xl mb-4 inline-block ${
                  selectedCategory === category.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {getIconComponent(category.icon)}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {category.name}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4">
                  {category.description}
                </p>
                
                <div className="space-y-2">
                  {category.features.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {category.features.length > 4 && (
                    <div className="text-sm text-gray-500">
                      +{category.features.length - 4} more features
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Repository Input */}
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              Enter Repository URL
            </h3>
            
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Github className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full pl-16 pr-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-white"
                required
                disabled={isAnalyzing}
              />
            </div>

            <button
              type="submit"
              disabled={isAnalyzing || !githubUrl.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Start Analysis
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Examples */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">Try with popular repositories:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                'https://github.com/vercel/next.js',
                'https://github.com/facebook/react',
                'https://github.com/microsoft/vscode',
                'https://github.com/vuejs/vue'
              ].map((url, index) => (
                <button
                  key={index}
                  onClick={() => setGithubUrl(url)}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-white/60 hover:bg-white/80 text-gray-700 rounded-lg transition-colors duration-200 text-sm font-medium disabled:opacity-50 border border-gray-200"
                >
                  {url.split('/').slice(-2).join('/')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
        currentConfig={llmConfig}
        currentGithubToken={githubToken}
      />

      <ProgressModal
        isOpen={isAnalyzing}
        currentStep={currentStep}
        progress={progress}
        error={error}
        onOpenSettings={() => {
          setShowSettings(true);
        }}
      />
    </div>
  );
};

export default AnalyzePage;