import React, { useState, useEffect } from 'react'; // Added useEffect
import { useNavigate, Link } from 'react-router-dom';
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
import { AnalysisService } from '../services/analysisService';
import { persistReport } from '../utils/persist';
import { LLMConfig, ReportCategory, AnalysisResult } from '../types/index'; // Added AnalysisResult

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
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
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

  useEffect(() => {
    const savedLlmConfigString = localStorage.getItem('llmConfig');
    if (savedLlmConfigString) {
      try {
        const parsedConfig: LLMConfig = JSON.parse(savedLlmConfigString);
        if (parsedConfig && parsedConfig.provider && parsedConfig.apiKey) {
          setLlmConfig(parsedConfig);
        } else {
          localStorage.removeItem('llmConfig'); // Clear invalid config
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

  const isAnalysisDataValid = (data: AnalysisResult): boolean => {
    if (!data) return false;
  
    // Basic validation - require at least basic info and commits
    const hasBasicInfo = data.basicInfo && Object.keys(data.basicInfo).length > 0;
    const hasCommits = data.commits && data.commits.length > 0;
  
    if (!hasBasicInfo || !hasCommits) {
        console.error('Validation Failed: Missing basic repository data or commit history.', { hasBasicInfo, hasCommits });
        return false;
    }
    
    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(undefined);
    setProgress(0);
    setCurrentStep('Initializing analysis...');

    try {
      const analysisService = new AnalysisService(githubToken, llmConfig);
      
      const { eventSource: newEventSource, analysisPromise } = analysisService.analyzeRepository(
        githubUrl,
        (step: string, progressValue: number) => {
          setCurrentStep(step);
          setProgress(progressValue);
        }
      );

      setEventSource(newEventSource);

      const result = await analysisPromise;

      setCurrentStep('Analysis complete. Preparing report...');
      setProgress(100);

      if (!isAnalysisDataValid(result)) {
        setError('Analysis Failed: The server returned incomplete data. Core metrics or architecture information could not be generated.');
        setIsAnalyzing(false);
        return;
      }

      const reportData = { ...result, repositoryUrl: githubUrl };

      try {
        await persistReport(`report_${result.id}`, reportData);

        const allReportsString = localStorage.getItem('allReports');
        const allReports = allReportsString ? JSON.parse(allReportsString) : [];
        allReports.unshift({
          id: result.id,
          name: result.basicInfo.fullName,
          createdAt: result.createdAt,
          summary: result.aiSummary || result.basicInfo.description,
        });
        localStorage.setItem('allReports', JSON.stringify(allReports.slice(0, 50)));
      } catch (e) {
        console.error(`Failed to save report to localStorage:`, e);
        setError(`Failed to save report details due to storage limits. Error: ${e instanceof Error ? e.message : String(e)}`);
        setIsAnalyzing(false);
        return;
      }

      setTimeout(() => {
        setIsAnalyzing(false);
        navigate(`/report/${result.id}`);
      }, 500); // Short delay to show 100%

    } catch (err) { // Changed variable name from error to err
      console.error('Analysis failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed due to an unknown error.';
      setError(errorMessage);
      setIsAnalyzing(false); 
      // No auto-clear for error, let ProgressModal handle it.
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
                <p className="text-gray-600 text-sm mb-4 min-h-[3em]"> {/* Ensure consistent height */}
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
          <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200">
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
        isOpen={isAnalyzing || !!error} // Show modal if analyzing OR if there's an error
        currentStep={currentStep}
        progress={progress}
        error={error}
        onClose={() => {
          setError(undefined);
        }}
        onOpenSettings={() => {
          setShowSettings(true);
          setError(undefined);
        }}
        onCancel={() => {
          if (eventSource) {
            eventSource.close();
          }
          setIsAnalyzing(false);
          setError('Analysis cancelled by user.');
        }}
      />
    </div>
  );
};

export default AnalyzePage;
