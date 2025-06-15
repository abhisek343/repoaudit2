# 🔍 Repo Auditor - Advanced Code Analysis Tool

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue)]()
[![React](https://img.shields.io/badge/React-18+-61dafb)]()

A powerful, **open-source** repository analysis tool that combines static code analysis with **AI-powered insights**. Bring your own LLM API key to unlock advanced features like architecture reviews, security analysis, and intelligent refactoring recommendations.

## ✨ Features

### 🔧 Core Analysis (No API Key Required)
- **Code Metrics**: Lines of code, complexity analysis, technical debt detection
- **Git History**: Commit patterns, contributor analysis, code churn visualization
- **File Structure**: Architecture mapping, dependency graphs, hotspot detection
- **Security Scanning**: Basic vulnerability detection, secret scanning
- **Performance Metrics**: Code complexity, potential bottlenecks

### 🤖 AI-Enhanced Features (Bring Your Own Key)
- **Intelligent Summaries**: AI-generated repository overviews and insights
- **Architecture Analysis**: Deep architectural pattern recognition and recommendations
- **Security Reviews**: Advanced threat analysis and remediation suggestions
- **Refactoring Roadmaps**: Prioritized improvement plans with effort estimates
- **Code Quality Insights**: Contextual recommendations for code improvement
- **Interactive Diagrams**: AI-enhanced Mermaid diagrams with intelligent tooltips

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Git** (for repository cloning)
- **Optional**: LLM API key from one of the supported providers

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/repo-auditor.git
   cd repo-auditor
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure environment (optional)**
   ```bash
   # Copy example environment file
   cd ../backend
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

4. **Start the application**
   ```bash
   # From the project root
   npm run dev
   ```

5. **Access the application**
   - Open [http://localhost:5173](http://localhost:5173) in your browser
   - The backend runs on [http://localhost:3001](http://localhost:3001)

## 🔑 LLM Provider Setup (Optional)

### Supported Providers

| Provider | Models | Setup Link | Context | Strengths |
|----------|--------|------------|---------|-----------|
| **OpenAI** | GPT-4, GPT-4o | [Get API Key](https://platform.openai.com/api-keys) | 128K tokens | Strong overall performance |
| **Google Gemini** | Gemini 2.0 Flash | [Get API Key](https://aistudio.google.com/app/apikey) | 1M tokens | Large context, multimodal |
| **Anthropic Claude** | Claude 3.5 Sonnet | [Get API Key](https://console.anthropic.com/account/keys) | 200K tokens | Excellent for code analysis |

### Configuration

1. **In the UI**: Click the Settings (⚙️) icon and configure your LLM provider
2. **Via Environment**: Set environment variables in `backend/.env`

```bash
# Choose your provider
OPENAI_API_KEY=sk-...
# OR
GOOGLE_AI_API_KEY=AI...
# OR  
ANTHROPIC_API_KEY=sk-ant-...
```

## 🏗️ Architecture

```
repo-auditor/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Application pages
│   │   ├── services/      # API and business logic
│   │   └── types/         # TypeScript definitions
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── services/      # Analysis engines
│   │   ├── types/         # Shared type definitions
│   │   └── config/        # Configuration files
└── docs/              # Documentation
```

## 🔒 Privacy & Security

- **Local Processing**: All code analysis happens locally - your code never leaves your machine
- **API Key Security**: LLM API keys are stored locally in your browser and only sent to official provider endpoints
- **No Data Collection**: We don't collect, store, or transmit your code or analysis results
- **Open Source**: Full transparency - inspect the code yourself

## 🎯 Use Cases

### For Developers
- **Code Reviews**: Get AI-powered insights before merging
- **Architecture Planning**: Understand patterns and plan improvements
- **Technical Debt**: Identify and prioritize refactoring opportunities
- **Onboarding**: Generate documentation and guides for new team members

### For Teams
- **Repository Health**: Monitor code quality across projects
- **Security Audits**: Identify vulnerabilities and security issues
- **Performance Optimization**: Find bottlenecks and optimization opportunities
- **Documentation**: Auto-generate architecture diagrams and documentation

### For Organizations
- **Due Diligence**: Assess code quality for acquisitions
- **Migration Planning**: Understand legacy systems before modernization
- **Compliance**: Security and quality compliance reporting
- **Knowledge Transfer**: Capture architectural knowledge

## 🛠️ Development

### Project Structure
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Visualization**: D3.js + Mermaid + Lucide icons
- **Analysis**: ESComplex, custom static analysis tools

### Contributing
We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test
```

## 📊 Analysis Examples

### Repository Overview
![Repository Overview](docs/images/overview.png)

### Architecture Diagrams
![Architecture Diagram](docs/images/architecture.png)

### Security Analysis
![Security Analysis](docs/images/security.png)

## 🤝 Community

- **Issues**: [GitHub Issues](https://github.com/your-org/repo-auditor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/repo-auditor/discussions)
- **Discord**: [Join our community](https://discord.gg/repo-auditor)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with love by the open source community
- Powered by amazing tools like React, TypeScript, D3.js, and Mermaid
- Thanks to all contributors who make this project possible

---

**⭐ If you find this project useful, please give it a star on GitHub!**

*Repo Auditor - Making code analysis accessible to everyone*
