import React from 'react';
import { 
  BookOpen, 
  Code, 
  GitBranch, 
  Lightbulb,
  ExternalLink,
  Terminal,
  FileText,
  Zap,
  Users,
  CheckCircle,
  ArrowRight,
  Globe
} from 'lucide-react';
import { AnalysisResult } from '../../types';

interface OnboardingPageProps {
  reportData: AnalysisResult;
}

const OnboardingPage = ({ reportData }: OnboardingPageProps) => {
  const { repository, languages, files } = reportData;

  // Determine primary language and framework
  const primaryLanguage = repository.language;
  const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
  const languagePercentages = Object.entries(languages)
    .map(([lang, bytes]) => ({ lang, percentage: (bytes / totalBytes) * 100 }))
    .sort((a, b) => b.percentage - a.percentage);

  // Detect framework/technology stack
  const detectTechStack = () => {
    const packageFiles = files.filter(f => 
      f.name === 'package.json' || 
      f.name === 'requirements.txt' || 
      f.name === 'Gemfile' ||
      f.name === 'pom.xml' ||
      f.name === 'Cargo.toml'
    );

    const configFiles = files.filter(f =>
      f.name.includes('config') ||
      f.name.includes('.env') ||
      f.name === 'docker-compose.yml' ||
      f.name === 'Dockerfile'
    );

    return {
      hasPackageManager: packageFiles.length > 0,
      hasDocker: files.some(f => f.name === 'Dockerfile' || f.name === 'docker-compose.yml'),
      hasCI: files.some(f => f.path.includes('.github/workflows') || f.name.includes('travis') || f.name.includes('circle')),
      framework: detectFramework(),
      buildTool: detectBuildTool()
    };
  };

  const detectFramework = () => {
    if (primaryLanguage === 'JavaScript' || primaryLanguage === 'TypeScript') {
      if (files.some(f => f.name === 'next.config.js')) return 'Next.js';
      if (files.some(f => f.path.includes('src/App.jsx') || f.path.includes('src/App.tsx'))) return 'React';
      if (files.some(f => f.name === 'vue.config.js')) return 'Vue.js';
      if (files.some(f => f.name === 'angular.json')) return 'Angular';
      return 'Node.js';
    }
    if (primaryLanguage === 'Python') {
      if (files.some(f => f.name === 'manage.py')) return 'Django';
      if (files.some(f => f.name === 'app.py' || f.path.includes('flask'))) return 'Flask';
      return 'Python';
    }
    if (primaryLanguage === 'Java') return 'Spring Boot';
    if (primaryLanguage === 'Go') return 'Go';
    if (primaryLanguage === 'Rust') return 'Rust';
    return primaryLanguage;
  };

  const detectBuildTool = () => {
    if (files.some(f => f.name === 'package.json')) return 'npm/yarn';
    if (files.some(f => f.name === 'pom.xml')) return 'Maven';
    if (files.some(f => f.name === 'build.gradle')) return 'Gradle';
    if (files.some(f => f.name === 'Cargo.toml')) return 'Cargo';
    if (files.some(f => f.name === 'requirements.txt')) return 'pip';
    return 'Unknown';
  };

  const techStack = detectTechStack();

  // Generate getting started guide based on detected technology
  const generateGettingStarted = () => {
    const steps = [];
    
    steps.push({
      title: 'Clone the Repository',
      command: `git clone https://github.com/${repository.fullName}.git`,
      description: 'Download the source code to your local machine'
    });

    steps.push({
      title: 'Navigate to Project Directory',
      command: `cd ${repository.name}`,
      description: 'Change to the project directory'
    });

    if (techStack.buildTool === 'npm/yarn') {
      steps.push({
        title: 'Install Dependencies',
        command: 'npm install',
        description: 'Install all required Node.js packages'
      });
      steps.push({
        title: 'Start Development Server',
        command: 'npm run dev',
        description: 'Launch the development server'
      });
    } else if (techStack.buildTool === 'pip') {
      steps.push({
        title: 'Create Virtual Environment',
        command: 'python -m venv venv && source venv/bin/activate',
        description: 'Create and activate a Python virtual environment'
      });
      steps.push({
        title: 'Install Dependencies',
        command: 'pip install -r requirements.txt',
        description: 'Install all required Python packages'
      });
    } else if (techStack.buildTool === 'Maven') {
      steps.push({
        title: 'Build Project',
        command: 'mvn clean install',
        description: 'Build the Java project with Maven'
      });
    }

    return steps;
  };

  const gettingStartedSteps = generateGettingStarted();

  // Generate quick win ideas
  const quickWinIdeas = [
    {
      title: 'Fix Documentation Typos',
      difficulty: 'Easy',
      impact: 'Low',
      description: 'Look for spelling mistakes or unclear explanations in README files',
      files: ['README.md', 'docs/']
    },
    {
      title: 'Add Missing Type Annotations',
      difficulty: 'Easy',
      impact: 'Medium',
      description: 'Improve code quality by adding type hints where missing',
      files: ['src/', 'lib/']
    },
    {
      title: 'Write Unit Tests',
      difficulty: 'Medium',
      impact: 'High',
      description: 'Increase test coverage by writing tests for uncovered functions',
      files: ['test/', 'spec/']
    },
    {
      title: 'Optimize Performance',
      difficulty: 'Hard',
      impact: 'High',
      description: 'Profile and optimize slow functions or database queries',
      files: ['src/', 'lib/']
    }
  ];

  const contributionAreas = [
    {
      area: 'Documentation',
      icon: <FileText className="w-5 h-5" />,
      description: 'Improve README, add examples, write tutorials',
      difficulty: 'Beginner Friendly'
    },
    {
      area: 'Bug Fixes',
      icon: <Code className="w-5 h-5" />,
      description: 'Fix reported issues and edge cases',
      difficulty: 'Intermediate'
    },
    {
      area: 'New Features',
      icon: <Zap className="w-5 h-5" />,
      description: 'Implement requested features and enhancements',
      difficulty: 'Advanced'
    },
    {
      area: 'Testing',
      icon: <CheckCircle className="w-5 h-5" />,
      description: 'Write tests, improve coverage, add integration tests',
      difficulty: 'All Levels'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Technology Stack Overview */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Code className="w-6 h-6 text-blue-500 mr-3" />
          Technology Stack
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Primary Language</h4>
            <p className="text-blue-700">{primaryLanguage}</p>
            <p className="text-sm text-blue-600 mt-1">
              {languagePercentages[0]?.percentage.toFixed(1)}% of codebase
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">Framework</h4>
            <p className="text-green-700">{techStack.framework}</p>
            <p className="text-sm text-green-600 mt-1">Main framework/runtime</p>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2">Build Tool</h4>
            <p className="text-purple-700">{techStack.buildTool}</p>
            <p className="text-sm text-purple-600 mt-1">Package manager</p>
          </div>

          <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
            <h4 className="font-semibold text-orange-900 mb-2">DevOps</h4>
            <div className="space-y-1">
              {techStack.hasDocker && <span className="inline-block px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded">Docker</span>}
              {techStack.hasCI && <span className="inline-block px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded ml-1">CI/CD</span>}
              {!techStack.hasDocker && !techStack.hasCI && <span className="text-orange-700">Basic setup</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Terminal className="w-6 h-6 text-green-500 mr-3" />
          Getting Started Guide
        </h3>

        <div className="space-y-6">
          {gettingStartedSteps.map((step, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
                <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm mb-2">
                  $ {step.command}
                </div>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Pro Tip</h4>
          </div>
          <p className="text-blue-700 text-sm">
            Check the project's README.md file for specific setup instructions and requirements. 
            Some projects may have additional dependencies or configuration steps.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* How to Contribute */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="w-6 h-6 text-purple-500 mr-3" />
            How to Contribute
          </h3>

          <div className="space-y-6">
            {contributionAreas.map((area, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors duration-200">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                    {area.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{area.area}</h4>
                    <span className="text-xs text-purple-600 font-medium">{area.difficulty}</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{area.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Contribution Workflow</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <ArrowRight className="w-4 h-4" />
                <span>Fork the repository</span>
              </div>
              <div className="flex items-center space-x-2">
                <ArrowRight className="w-4 h-4" />
                <span>Create a feature branch</span>
              </div>
              <div className="flex items-center space-x-2">
                <ArrowRight className="w-4 h-4" />
                <span>Make your changes</span>
              </div>
              <div className="flex items-center space-x-2">
                <ArrowRight className="w-4 h-4" />
                <span>Submit a pull request</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Win Ideas */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Lightbulb className="w-6 h-6 text-yellow-500 mr-3" />
            Quick Win Ideas
          </h3>

          <div className="space-y-4">
            {quickWinIdeas.map((idea, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-yellow-300 transition-colors duration-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{idea.title}</h4>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      idea.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                      idea.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {idea.difficulty}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      idea.impact === 'Low' ? 'bg-gray-100 text-gray-800' :
                      idea.impact === 'Medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {idea.impact} Impact
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2">{idea.description}</p>
                <div className="flex flex-wrap gap-1">
                  {idea.files.map((file, fileIndex) => (
                    <span key={fileIndex} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono">
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Build Process & Architecture Diagrams */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <GitBranch className="w-6 h-6 text-indigo-500 mr-3" />
          Architecture & Build Process
        </h3>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Build Process */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Build Process</h4>
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
                  <div>
                    <div className="font-medium text-gray-900">Source Code</div>
                    <div className="text-sm text-gray-600">Developer writes code</div>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>

                <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
                  <div>
                    <div className="font-medium text-gray-900">Build & Test</div>
                    <div className="text-sm text-gray-600">{techStack.buildTool} processes code</div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>

                <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</div>
                  <div>
                    <div className="font-medium text-gray-900">Deploy</div>
                    <div className="text-sm text-gray-600">Application goes live</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Component Architecture */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Component Architecture</h4>
            <div className="bg-gray-50 rounded-xl p-6 h-64 flex items-center justify-center">
              <div className="text-center">
                <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Interactive architecture diagram</p>
                <p className="text-sm text-gray-400 mt-2">Component hierarchy and data flow visualization</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Useful Resources */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <BookOpen className="w-6 h-6 text-orange-500 mr-3" />
          Useful Resources
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <a 
            href={`https://github.com/${repository.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors duration-200 group"
          >
            <div className="flex items-center space-x-3 mb-2">
              <ExternalLink className="w-5 h-5 text-orange-500 group-hover:text-orange-600" />
              <h4 className="font-semibold text-gray-900">GitHub Repository</h4>
            </div>
            <p className="text-gray-600 text-sm">View source code, issues, and pull requests</p>
          </a>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <h4 className="font-semibold text-gray-900">Documentation</h4>
            </div>
            <p className="text-gray-600 text-sm">API docs, guides, and examples</p>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Users className="w-5 h-5 text-green-500" />
              <h4 className="font-semibold text-gray-900">Community</h4>
            </div>
            <p className="text-gray-600 text-sm">Discord, Slack, or forum discussions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;