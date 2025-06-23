import React, { useMemo } from 'react'; // Added useMemo
import { 
  BookOpen, 
  Code, 
  Lightbulb,
  ExternalLink,
  Terminal,
  FileText,
  Zap,
  Users,
  CheckCircle,
  ArrowRight,
  Layers // For architecture diagram icon
} from 'lucide-react'; // Removed GitBranch, Globe
import { AnalysisResult, FileInfo as CoreFileInfo } from '../../types';
import ArchitectureDiagram from '../diagrams/ArchitectureDiagram'; // For a small architecture preview

interface OnboardingPageProps {
  analysisResult: AnalysisResult;
}

const OnboardingPage = ({ analysisResult: reportData }: OnboardingPageProps) => {
  const { basicInfo, languages, files } = reportData;

  const primaryLanguage = useMemo(() => basicInfo.language || 'N/A', [basicInfo.language]);
  
  const languagePercentages = useMemo(() => {
    const totalBytes = Object.values(languages || {}).reduce((sum, bytes) => sum + bytes, 0);
    if (totalBytes === 0) return [];
    return Object.entries(languages || {})
      .map(([lang, bytes]) => ({ lang, percentage: (bytes / totalBytes) * 100 }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [languages]);

  const techStack = useMemo(() => {
    const localFiles = files || [];
    const primaryLang = primaryLanguage.toLowerCase();

    let framework = 'Generic';
    let buildTool = 'Unknown';
    let packageManager = 'Unknown';

    if (primaryLang === 'javascript' || primaryLang === 'typescript') {
      if (localFiles.some(f => f.name === 'next.config.js' || f.name === 'next.config.mjs')) framework = 'Next.js';
      else if (localFiles.some(f => f.path.includes('angular.json'))) framework = 'Angular';
      else if (localFiles.some(f => f.name === 'vue.config.js' || localFiles.some(f => f.path.includes('src/main.ts') && f.content?.includes('createApp(App).mount')))) framework = 'Vue.js';
      else if (localFiles.some(f => f.path.includes('src/App.jsx') || f.path.includes('src/App.tsx') || (f.content?.includes('React.createElement') || f.content?.includes('from "react"')) )) framework = 'React';
      else if (localFiles.some(f => f.name === 'package.json' && f.content?.includes('"express"'))) framework = 'Express.js';
      else framework = 'Node.js/Frontend';
      
      if (localFiles.some(f => f.name === 'yarn.lock')) packageManager = 'Yarn';
      else if (localFiles.some(f => f.name === 'pnpm-lock.yaml')) packageManager = 'PNPM';
      else if (localFiles.some(f => f.name === 'package-lock.json' || f.name === 'package.json')) packageManager = 'NPM';
      buildTool = packageManager; // Often the same for JS
    } else if (primaryLang === 'python') {
      if (localFiles.some(f => f.name === 'manage.py' && f.content?.includes('django'))) framework = 'Django';
      else if (localFiles.some(f => (f.name === 'app.py' || f.name === 'main.py') && f.content?.includes('Flask(__name__)'))) framework = 'Flask';
      else framework = 'Python';
      if (localFiles.some(f => f.name === 'requirements.txt')) packageManager = 'pip';
      buildTool = 'pip/setuptools';
    } else if (primaryLang === 'java') {
      if (localFiles.some(f => f.name === 'pom.xml' && f.content?.includes('spring-boot'))) framework = 'Spring Boot';
      else framework = 'Java';
      if (localFiles.some(f => f.name === 'pom.xml')) { packageManager = 'Maven'; buildTool = 'Maven'; }
      else if (localFiles.some(f => f.name === 'build.gradle')) { packageManager = 'Gradle'; buildTool = 'Gradle'; }
    } else if (primaryLang === 'go') {
        framework = 'Go (Stdlib/Gin/Echo)'; // Generic, hard to detect specific Go framework without deeper analysis
        if (localFiles.some(f => f.name === 'go.mod')) packageManager = 'Go Modules';
        buildTool = 'Go CLI';
    } else if (primaryLang === 'rust') {
        framework = 'Rust (Actix/Rocket/Tokio)'; // Generic
        if (localFiles.some(f => f.name === 'Cargo.toml')) packageManager = 'Cargo';
        buildTool = 'Cargo';
    } else {
        framework = primaryLanguage; // Fallback to language name
    }


    return {
      hasPackageManager: packageManager !== 'Unknown',
      packageManager,
      buildTool,
      hasDocker: localFiles.some(f => f.name.toLowerCase() === 'dockerfile' || f.name.toLowerCase() === 'docker-compose.yml'),
      hasCI: localFiles.some(f => f.path.includes('.github/workflows') || f.name.toLowerCase().includes('travis') || f.name.toLowerCase().includes('circleci') || f.name.toLowerCase().includes('gitlab-ci')),
      framework,
    };
  }, [files, primaryLanguage]);

  const gettingStartedSteps = useMemo(() => {
    const steps = [];
    steps.push({ title: 'Clone Repository', command: `git clone https://github.com/${basicInfo.fullName}.git`, description: 'Get the source code.' });
    steps.push({ title: 'Navigate to Directory', command: `cd ${basicInfo.name}`, description: 'Enter the project folder.' });

    if (techStack.packageManager === 'NPM') {
      steps.push({ title: 'Install Dependencies', command: 'npm install', description: 'Install Node.js packages.' });
      steps.push({ title: 'Run Development Server', command: 'npm run dev (or start)', description: 'Launch the app locally.' });
    } else if (techStack.packageManager === 'Yarn') {
      steps.push({ title: 'Install Dependencies', command: 'yarn install', description: 'Install Node.js packages.' });
      steps.push({ title: 'Run Development Server', command: 'yarn dev (or start)', description: 'Launch the app locally.' });
    } else if (techStack.packageManager === 'PNPM') {
      steps.push({ title: 'Install Dependencies', command: 'pnpm install', description: 'Install Node.js packages.' });
      steps.push({ title: 'Run Development Server', command: 'pnpm dev (or start)', description: 'Launch the app locally.' });
    } else if (techStack.packageManager === 'pip') {
      steps.push({ title: 'Create & Activate Venv', command: 'python -m venv venv && source venv/bin/activate # or .\\venv\\Scripts\\activate', description: 'Setup Python environment.' });
      steps.push({ title: 'Install Dependencies', command: 'pip install -r requirements.txt', description: 'Install Python packages.' });
      steps.push({ title: 'Run Application', command: 'python manage.py runserver (Django) or python app.py (Flask)', description: 'Start the Python app.' });
    } else if (techStack.buildTool === 'Maven') {
      steps.push({ title: 'Build Project', command: 'mvn clean install', description: 'Build with Maven.' });
      steps.push({ title: 'Run Application', command: 'mvn spring-boot:run (or java -jar target/*.jar)', description: 'Run the Java app.' });
    } else if (techStack.buildTool === 'Gradle') {
      steps.push({ title: 'Build Project', command: './gradlew build', description: 'Build with Gradle.' });
      steps.push({ title: 'Run Application', command: './gradlew bootRun (or java -jar build/libs/*.jar)', description: 'Run the Java app.' });
    } else if (techStack.buildTool === 'Cargo') {
        steps.push({ title: 'Build Project', command: 'cargo build', description: 'Build with Cargo.' });
        steps.push({ title: 'Run Application', command: 'cargo run', description: 'Run the Rust app.' });
    } else if (techStack.buildTool === 'Go CLI') {
        steps.push({ title: 'Build Project', command: 'go build ./...', description: 'Build with Go.' });
        steps.push({ title: 'Run Application', command: 'go run main.go (or ./executable_name)', description: 'Run the Go app.' });
    }
    // Add a generic testing step
    if (files.some(f => f.name === 'package.json' && f.content?.includes('"test"'))) {
        steps.push({ title: 'Run Tests', command: `${techStack.packageManager.toLowerCase()} test`, description: 'Execute automated tests.' });
    } else if (techStack.buildTool === 'Maven') {
         steps.push({ title: 'Run Tests', command: 'mvn test', description: 'Execute automated tests.' });
    }
    return steps;
  }, [basicInfo.fullName, basicInfo.name, techStack, files]);

  const quickWinIdeas = useMemo(() => [ // These remain somewhat generic as they are hard to derive automatically without LLM
    { title: 'Improve Documentation', difficulty: 'Easy', impact: 'Medium', description: 'Clarify README, add comments to complex code sections, or update outdated docs.', files: ['README.md', 'docs/'] },
    { title: 'Add Unit Tests', difficulty: 'Medium', impact: 'High', description: 'Increase test coverage for critical functions or modules with low coverage.', files: (files.filter(f => f.path.includes('test') || f.path.includes('spec')).map(f=>f.path).slice(0,1) || ['src/utils/']) },
    { title: 'Refactor a Complex Function', difficulty: 'Medium', impact: 'Medium', description: 'Identify a function with high complexity and simplify its logic or break it down.', files: (reportData.keyFunctions?.slice(0,1).map(kf => kf.file) || ['src/core/']) },
    { title: 'Fix a "good first issue"', difficulty: 'Easy', impact: 'Medium', description: 'Check the repository issues tab for items labeled "good first issue" or "help wanted".', files: ['GitHub Issues Tab'] },
  ], [files, reportData.keyFunctions]);

  const contributionAreas = [
    { area: 'Documentation', icon: <FileText />, description: 'Improve READMEs, API docs, tutorials.', difficulty: 'Easy' },
    { area: 'Bug Fixing', icon: <Code />, description: 'Address open issues, fix edge cases.', difficulty: 'Medium' },
    { area: 'Feature Development', icon: <Zap />, description: 'Implement new features, enhancements.', difficulty: 'Hard' },
    { area: 'Testing', icon: <CheckCircle />, description: 'Write unit/integration tests, improve coverage.', difficulty: 'Medium' },
  ];

  const archDiagramFileInfo = useMemo(() => {
    const info: Record<string, CoreFileInfo> = {};
    (files || []).forEach(file => { info[file.path] = file; });
    return info;
  }, [files]);

  const baseMermaidDiagram = useMemo(() => {
    // Simplified version for onboarding, focusing on top-level structure
    let diagram = `graph TD\n`;
    diagram += `  subgraph Client\n    UI["User Interface"]\n  end\n`;
    diagram += `  subgraph Server\n    API["API Layer"]\n    Logic["Business Logic"]\n    DataStore["Data Storage"]\n  end\n`;
    diagram += `  UI --> API\n  API --> Logic\n  Logic --> DataStore\n`;
    if(techStack.hasCI) diagram += `  CICD["CI/CD Pipeline"]-.->Server\n`;
    if(techStack.hasDocker) diagram += `  Docker["Docker Container"]-.->Server\n`;
    return diagram;
  }, [techStack]);


  return (
    <div className="space-y-8">
      <header className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
          <BookOpen className="w-8 h-8 text-indigo-600 mr-4" />
          Developer Onboarding Guide: {basicInfo.name}
        </h3>
        <p className="text-lg text-gray-600">
          Welcome! This guide helps new contributors understand the project structure and get started quickly.
        </p>
      </header>

      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Code className="w-6 h-6 text-blue-500 mr-3" />
          Technology Stack
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TechStackCard title="Primary Language" value={primaryLanguage} details={`${languagePercentages[0]?.percentage.toFixed(1) || 'N/A'}% of codebase`} />
          <TechStackCard title="Framework/Runtime" value={techStack.framework} details="Main application framework" />
          <TechStackCard title="Package Manager" value={techStack.packageManager} details={techStack.hasPackageManager ? "Used for dependencies" : "Not detected"} />
          <TechStackCard title="Build Tool" value={techStack.buildTool} details="Compiles/bundles the project" />
          <TechStackCard title="CI/CD" value={techStack.hasCI ? 'Detected' : 'Not Detected'} details="Automated build & deploy pipeline" />
          <TechStackCard title="Containerization" value={techStack.hasDocker ? 'Docker Detected' : 'Not Detected'} details="Uses Docker for environment consistency" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Terminal className="w-6 h-6 text-green-500 mr-3" />
          Quick Start Guide
        </h3>
        <div className="space-y-6">
          {gettingStartedSteps.map((step, index) => (
            <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow">
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-1">{step.title}</h4>
                <div className="bg-gray-800 text-green-300 p-3 rounded-md font-mono text-sm overflow-x-auto mb-2 shadow-inner">
                  <span className="select-none text-gray-500">$ </span>{step.command}
                </div>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-700 text-sm">
          <Lightbulb className="inline w-5 h-5 mr-2" />
          Always check the project's <code className="bg-blue-100 px-1 rounded">README.md</code> and any <code className="bg-blue-100 px-1 rounded">CONTRIBUTING.md</code> files for the most up-to-date and specific setup instructions.
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Layers className="w-6 h-6 text-teal-500 mr-3" />
            Simplified Architecture Overview
          </h3>
          <div className="min-h-[300px] border rounded-lg p-4 bg-gray-50">
            <ArchitectureDiagram
                diagram={baseMermaidDiagram}
                title="Conceptual Architecture"
                interactive={false}
                fileInfo={archDiagramFileInfo}
                height={300}
                useLLM={false} // Keep this simple for onboarding
            />
          </div>
           <p className="text-sm text-gray-500 mt-4">This is a conceptual diagram. For a detailed, interactive view, visit the 'Architecture' or 'Diagrams' tab.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="w-6 h-6 text-purple-500 mr-3" />
            How to Contribute
          </h3>
          <div className="space-y-4">
            {contributionAreas.map((area, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors duration-200 bg-white shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">{React.cloneElement(area.icon as React.ReactElement, { className: "w-5 h-5" })}</div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{area.area}</h4>
                    <span className="text-xs text-purple-600 font-medium">{area.difficulty}</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{area.description}</p>
              </div>
            ))}
          </div>
           <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-800 mb-2">General Workflow:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Fork the repository & create a new branch.</li>
              <li>Make your changes & commit them with clear messages.</li>
              <li>Ensure all tests pass (run <code className="bg-gray-200 px-1 rounded">{techStack.packageManager === 'Unknown' ? 'tests' : `${techStack.packageManager.toLowerCase()} test`}</code>).</li>
              <li>Push to your fork and submit a Pull Request to the main repository.</li>
              <li>Respond to feedback from reviewers.</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Lightbulb className="w-6 h-6 text-yellow-500 mr-3" />
          Quick Win Ideas for New Contributors
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {quickWinIdeas.map((idea, index) => (
            <div key={index} className="p-6 border border-gray-200 rounded-xl hover:border-yellow-400 transition-colors duration-200 bg-yellow-50/50 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">{idea.title}</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  idea.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>{idea.difficulty}</span>
              </div>
              <p className="text-gray-600 text-sm mb-3">{idea.description}</p>
              <div className="text-xs text-gray-500">
                Impact: <span className="font-medium">{idea.impact}</span> | Relevant files/areas:
                <div className="flex flex-wrap gap-1 mt-1">
                    {idea.files.map((file, i) => <code key={i} className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded">{file}</code>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <ExternalLink className="w-6 h-6 text-orange-500 mr-3" />
          Key Resources
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ResourceLink href={`https://github.com/${basicInfo.fullName}`} title="GitHub Repository" description="Source code, issues, PRs." />
          <ResourceLink href={`https://github.com/${basicInfo.fullName}/issues`} title="Issue Tracker" description="Report bugs, suggest features." />
          <ResourceLink href={`https://github.com/${basicInfo.fullName}/pulls`} title="Pull Requests" description="Ongoing development and reviews." />
          {basicInfo.hasWiki && <ResourceLink href={`https://github.com/${basicInfo.fullName}/wiki`} title="Project Wiki" description="Additional documentation." />}
          {/* Add more links if detectable, e.g., official docs website */}
        </div>
      </div>
    </div>
  );
};

const TechStackCard: React.FC<{title: string; value: string; details: string}> = ({ title, value, details }) => (
  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
    <h4 className="font-semibold text-gray-800 mb-1">{title}</h4>
    <p className="text-indigo-600 font-medium text-lg">{value}</p>
    <p className="text-xs text-gray-500 mt-1">{details}</p>
  </div>
);

const ResourceLink: React.FC<{href: string; title: string; description: string}> = ({ href, title, description }) => (
  <a 
    href={href} target="_blank" rel="noopener noreferrer"
    className="block p-4 border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50/30 transition-colors duration-200 group shadow-sm hover:shadow"
  >
    <h4 className="font-semibold text-gray-800 group-hover:text-orange-700 mb-1">{title}</h4>
    <p className="text-gray-600 text-sm">{description}</p>
    <ArrowRight className="w-4 h-4 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2" />
  </a>
);

export default OnboardingPage;
