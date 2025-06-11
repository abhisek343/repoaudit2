import { Link } from 'react-router-dom';
import { Github, Zap, BarChart3, Users, Code2, ArrowRight, CheckCircle, Shield, TrendingUp, Clock, Cpu } from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-indigo-600" />,
      title: "Latest AI Models",
      description: "Powered by GPT-4o, Claude 3.5 Sonnet, and Gemini 2.0 with up to 2M token context for comprehensive analysis"
    },
    {
      icon: <Shield className="w-8 h-8 text-emerald-600" />,
      title: "Security Auditing",
      description: "Comprehensive security analysis including secret detection, vulnerability scanning, and compliance checks"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-orange-600" />,
      title: "Performance Metrics",
      description: "Algorithmic complexity analysis, performance bottleneck detection, and optimization recommendations"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-purple-600" />,
      title: "Visual Insights",
      description: "Interactive charts, dependency graphs, and architectural diagrams reveal code structure and complexity"
    },
    {
      icon: <Users className="w-8 h-8 text-blue-600" />,
      title: "Team Analytics",
      description: "Understand contributor patterns, knowledge distribution, and calculate bus factor risks"
    },
    {
      icon: <Code2 className="w-8 h-8 text-red-600" />,
      title: "Deep Code Review",
      description: "Function-level analysis with logic flow diagrams, technical debt assessment, and refactoring roadmaps"
    }
  ];

  const analysisTypes = [
    {
      name: "Comprehensive Analysis",
      description: "Complete audit with all features",
      features: ["AI Insights", "Security Scan", "Performance Analysis", "Architecture Review"],
      popular: true
    },
    {
      name: "Security Audit",
      description: "Focus on vulnerabilities and compliance",
      features: ["Secret Detection", "Vulnerability Scan", "Dependency Check", "Security Recommendations"]
    },
    {
      name: "Performance Review",
      description: "Optimize for speed and efficiency",
      features: ["Complexity Analysis", "Bottleneck Detection", "Optimization Tips", "Benchmark Data"]
    },
    {
      name: "Team Dynamics",
      description: "Understand collaboration patterns",
      features: ["Contributor Analysis", "Knowledge Silos", "Bus Factor", "Review Metrics"]
    }
  ];

  const aiModels = [
    {
      provider: "OpenAI",
      model: "GPT-4o",
      context: "128K tokens",
      strengths: "Flagship model, fast, multimodal",
      icon: <Cpu className="w-5 h-5 text-green-500" />
    },
    {
      provider: "Google",
      model: "Gemini 1.5 Pro",
      context: "1M tokens",
      strengths: "Massive context, strong reasoning",
      icon: <Clock className="w-5 h-5 text-blue-500" />
    },
    {
      provider: "Anthropic",
      model: "Claude 3.5 Sonnet",
      context: "200K tokens",
      strengths: "Fast, intelligent, industry-leading vision",
      icon: <Shield className="w-5 h-5 text-purple-500" />
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
                <Github className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Repo Auditor</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/analyze"
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
              >
                Start Analysis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                <Github className="w-16 h-16 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AI-Powered
              </span>
              <br />
              Repository Audits
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Get comprehensive insights into any GitHub repository with 
              <span className="text-indigo-600 font-semibold"> latest AI models</span>,
              <span className="text-emerald-600 font-semibold"> security auditing</span>, and
              <span className="text-orange-600 font-semibold"> performance optimization</span>.
            </p>

            {/* AI Models Showcase */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-12 max-w-4xl mx-auto border border-gray-200">
              <div className="flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-indigo-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Powered by Latest AI Models</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {aiModels.map((model, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      {model.icon}
                      <span className="font-medium text-gray-900">{model.provider}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{model.model}</div>
                    <div className="text-xs text-blue-600 mb-2">{model.context}</div>
                    <div className="text-xs text-gray-500">{model.strengths}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Up to 2M tokens supported
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                to="/analyze"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Start Free Analysis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                View Sample Reports
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Open source & free</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>No registration required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Latest AI models</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Types Section */}
      <div className="py-24 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Analysis Type
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From comprehensive audits to focused security reviews, we provide the insights you need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {analysisTypes.map((type, index) => (
              <div 
                key={index}
                className="relative p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-indigo-200 hover:-translate-y-2"
              >
                {type.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {type.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {type.description}
                </p>
                
                <div className="space-y-2">
                  {type.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Analysis Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform provides comprehensive insights into repository health, 
              code quality, and team dynamics using the latest language models.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-indigo-200 hover:-translate-y-2"
              >
                <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Analyze Your Repository?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of developers who trust Repo Auditor for comprehensive code analysis.
          </p>
          <Link
            to="/analyze"
            className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
                <Github className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Repo Auditor</span>
            </div>
            
            <div className="text-gray-400 text-sm">
              © 2024 Repo Auditor. Open source and free to use.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
