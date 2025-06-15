import React, { useState, useEffect, useLayoutEffect } from 'react'; // Added useLayoutEffect
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { 
  Search, 
  Github, 
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
  Key,
  Loader2 // For spinner
} from 'lucide-react';
import SettingsModal from '../components/SettingsModal';
import ProgressModal from '../components/ProgressModal';
import { LLMConfig, ReportCategory, AnalysisResult } from '../types/index'; // Added AnalysisResult
import { AnalysisService } from '../services/analysisService'; // Added AnalysisService

const AnalyzePage = () => {
  const navigate = useNavigate();
  const [githubUrl, setGithubUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('comprehensive');
  const [showSettings, setShowSettings] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | undefined>();
  const [githubToken, setGithubToken] = useState<string | undefined>();

  // State for analysis lifecycle, moved from App.tsx
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

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

  useEffect(() => {
    const savedLlmConfigString = localStorage.getItem('llmConfig');
    if (savedLlmConfigString) {
      try {
        const parsedConfig: LLMConfig = JSON.parse(savedLlmConfigString);
        if (parsedConfig && parsedConfig.provider && parsedConfig.apiKey) {
          setLlmConfig(parsedConfig);
        } else {
          localStorage.removeItem('llmConfig'); 
        }
      } catch (e) {
        console.error("Failed to parse LLM config from localStorage", e);
        localStorage.removeItem('llmConfig');
      }
    }
    const savedGithubToken = localStorage.getItem('githubToken');
    if (savedGithubToken) {
      setGithubToken(savedGithubToken);
    }
  }, []);

  // Effect for body overflow, moved from App.tsx
  useLayoutEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const isModalOpen = isAnalyzing || !!error;

    if (isModalOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isAnalyzing, error]);


  const handleSettingsSave = (config: LLMConfig, token?: string) => {
    setLlmConfig(config);
    localStorage.setItem('llmConfig', JSON.stringify(config));
    
    if (token) {
      setGithubToken(token);
      localStorage.setItem('githubToken', token);
    } else {
      setGithubToken(undefined);
      localStorage.removeItem('githubToken');
    }
  };

  const handleAnalysisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    setIsAnalyzing(true);
    setError(undefined);
    setProgress(0);
    setCurrentStep('Initializing analysis...');
    
    const savedToken = localStorage.getItem('githubToken');
    const analysisService = new AnalysisService(savedToken || undefined);
    
    const { eventSource: newEventSource, analysisPromise } = analysisService.analyzeRepository(
      githubUrl,
      (step: string, progressValue: number) => {
        setCurrentStep(step);
        setProgress(progressValue);
      }
    );

    setEventSource(newEventSource);

    analysisPromise
      .then((result: AnalysisResult) => {
        setIsAnalyzing(false);
        // persistReport(result); // If you have a local storage persistence helper
        const reportId = result.id;
        const navigationPath = `/report/${reportId}`;
        navigate(navigationPath, { state: { analysisResultFromNavigation: result } });
      })
      .catch((err) => {
        console.error('Analysis failed:', err);
        setError(err.message || 'Analysis failed. Please try again.');
        setIsAnalyzing(false);
      });
  };
  
  const handleCancelAnalysis = () => {
    if (eventSource) {
      eventSource.close();
    }
    setIsAnalyzing(false);
    setError('Analysis cancelled by user.');
  };

  const handleErrorClear = () => {
    setError(undefined);
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
    <>
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
            Choose your analysis type and get comprehensive insights into any GitHub repository.
          </p>

          {githubToken ? (
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4 mr-2" />
              GitHub Token Configured (Enhanced Rate Limits)
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Limited GitHub API Rate (60 reqs/hr)
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

          {llmConfig && llmConfig.apiKey ? (
            <div className="mt-3 inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4 mr-2" />
              AI Analysis Configured ({llmConfig.provider || 'Default'})
            </div>
          ) : (
             <div className="mt-3 inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4 mr-2 text-gray-500" />
              AI Analysis Not Configured (Insights will be limited)
            </div>
          )}
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Choose Analysis Type
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => !isAnalyzing && setSelectedCategory(category.id)}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedCategory === category.id
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg ring-2 ring-indigo-500 ring-offset-2'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                } ${isAnalyzing ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div className={`p-3 rounded-xl mb-4 inline-block ${
                  selectedCategory === category.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {getIconComponent(category.icon)}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {category.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4 min-h-[3em]">
                  {category.description}
                </p>
                <div className="space-y-1.5">
                  {category.features.slice(0, 3).map((feature: string, index: number) => (
                    <div key={index} className="flex items-center text-xs text-gray-700">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 mr-1.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {category.features.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{category.features.length - 3} more features
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleAnalysisSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              Enter GitHub Repository URL
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
                className="w-full pl-16 pr-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all duration-200 bg-white shadow-sm"
                required
                disabled={isAnalyzing}
              />
            </div>
            <button
              type="submit"
              disabled={isAnalyzing || !githubUrl.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-6 h-6" />
                  Start Analysis
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">Or try with popular repositories:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                'https://github.com/vercel/next.js',
                'https://github.com/stedolan/jq',
                'https://github.com/microsoft/vscode',
                'https://github.com/vuejs/vue'
              ].map((url, index) => (
                <button
                  key={index}
                  onClick={() => setGithubUrl(url)}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-white/80 hover:bg-white text-gray-700 rounded-lg transition-colors duration-200 text-sm font-medium disabled:opacity-50 border border-gray-300 hover:border-gray-400 shadow-sm"
                >
                  {url.split('/').slice(-2).join('/')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
        currentConfig={llmConfig}
        currentGithubToken={githubToken}
      />

      <ProgressModal
        isOpen={isAnalyzing || !!error}
        currentStep={currentStep}
        progress={progress}
        error={error}
        onClose={handleErrorClear} // Use local handler
        onOpenSettings={() => {
          setShowSettings(true);
        }}
        onCancel={handleCancelAnalysis} // Use local handler
      />
    </>
  );
};

export default AnalyzePage;
