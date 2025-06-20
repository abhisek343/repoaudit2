# 🔍 Repo Auditor - Advanced Code Analysis Tool

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue)]()
[![React](https://img.shields.io/badge/React-18+-61dafb)]()

A powerful, **production-ready** repository analysis tool that combines comprehensive static code analysis with **AI-powered insights**. Supports multiple programming languages and provides detailed visualizations for understanding your codebase.

## 🎯 What's New - Fully Implemented Features

### ✅ Complete Backend Implementation
- **Multi-Language Support**: JavaScript, TypeScript, Python, Java, Go, Rust, C#, PHP, Ruby
- **Advanced File Analysis**: Enhanced complexity calculation, dependency tracking, coupling analysis
- **Comprehensive API Endpoints**: RESTful API with full CRUD operations and real-time progress
- **Robust Error Handling**: Circuit breakers, retry logic, and comprehensive logging
- **Production-Ready**: Built with TypeScript, includes validation, and comprehensive testing setup

### ✅ Enhanced Frontend Features  
- **Modern React Architecture**: Built with React 18, TypeScript, and Tailwind CSS
- **Advanced Visualizations**: 15+ interactive charts and diagrams using D3.js, Recharts, and Cytoscape
- **Responsive Design**: Mobile-first design with dark mode support
- **Real-time Updates**: Live progress tracking with Server-Sent Events
- **Error Boundaries**: Comprehensive error handling and 404 pages
- **State Management**: Persistent storage with IndexedDB integration

### ✅ AI Integration (Multiple Providers)
- **OpenAI GPT Models**: GPT-3.5, GPT-4, and latest models
- **Anthropic Claude**: Claude-3 series models
- **Google Gemini**: Gemini Pro and latest models
- **Intelligent Analysis**: Architecture patterns, security reviews, performance optimization
- **Dynamic Configuration**: Runtime LLM provider switching and validation

### ✅ Advanced Analysis Capabilities
- **Temporal Coupling**: Git history analysis to detect co-changing files
- **Architecture Pattern Detection**: Automatic identification of MVC, microservices, etc.
- **Security Analysis**: Vulnerability detection, dependency scanning, secret detection
- **Performance Metrics**: Complexity analysis, bottleneck identification, optimization suggestions
- **Technical Debt**: Code smell detection, refactoring recommendations
- **Feature Matrix**: Automatic mapping of features to source files

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Git** (for repository cloning)
- **Optional**: LLM API key from supported providers (OpenAI, Anthropic, Google)

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
   npm install --legacy-peer-deps
   ```

3. **Build the application**
   ```bash
   # Build backend
   cd backend
   npm run build
   
   # Build frontend
   cd ../frontend
   npm run build
   ```

4. **Start the application**
   ```bash
   # Start backend server (from backend directory)
   npm run dev
   
   # In another terminal, start frontend (from frontend directory)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 🔧 Configuration

### Environment Variables (Optional)
Create `.env` files in respective directories:

**Backend (.env)**
```bash
# Optional: Pre-configure LLM providers (users can also add via UI)
OPENAI_API_KEY=your_openai_key_here
CLAUDE_API_KEY=your_claude_key_here  
GEMINI_API_KEY=your_gemini_key_here

# Optional: GitHub token for higher rate limits
GITHUB_TOKEN=your_github_token_here

# Optional: Analysis tuning
MAX_CONTENT=800
LLM_VULN_DELAY_MS=2000
PERF_METRICS_FILE_LIMIT=5
```

**Frontend (.env)**
```bash
VITE_API_BASE_URL=http://localhost:3001
```

### LLM Provider Setup
1. **Via Settings UI** (Recommended):
   - Click the Settings icon in the app
   - Choose your LLM provider
   - Enter your API key
   - Test the connection

2. **Supported Providers**:
   - **OpenAI**: gpt-3.5-turbo, gpt-4, gpt-4-turbo
   - **Anthropic**: claude-3-haiku, claude-3-sonnet, claude-3-opus
   - **Google**: gemini-pro, gemini-pro-vision

## 📊 Analysis Features

### Core Analysis (No API Key Required)
- **Repository Overview**: Stars, forks, contributors, recent activity
- **Code Metrics**: Lines of code, file count, language distribution
- **Git Analysis**: Commit frequency, contributor activity, change patterns
- **File Structure**: Directory tree, file dependencies, architecture mapping
- **Complexity Analysis**: Cyclomatic complexity, maintainability index
- **Hotspot Detection**: Most changed files, high-complexity areas

### AI-Enhanced Analysis (API Key Required)
- **Architecture Review**: Pattern detection, design recommendations
- **Security Analysis**: Vulnerability assessment, security best practices
- **Performance Analysis**: Bottleneck identification, optimization suggestions
- **Code Quality Review**: Technical debt analysis, refactoring priorities
- **Documentation Generation**: Auto-generated summaries and explanations

## 🎨 Visualizations

### Interactive Charts & Diagrams
1. **Dependency Graphs**: Cytoscape-powered network visualizations
2. **Code Complexity Heatmaps**: D3.js heat maps showing complexity distribution
3. **Git History Visualizations**: Commit timelines and contributor activity
4. **Architecture Diagrams**: Auto-generated system architecture views
5. **Performance Metrics**: Real-time performance dashboards
6. **Security Dashboards**: Vulnerability tracking and remediation progress
7. **Contributor Analysis**: Team contribution patterns and expertise areas
8. **Code Churn Analysis**: File change frequency and stability metrics
9. **API Documentation Trees**: Interactive API structure exploration
10. **Feature Matrix**: Feature-to-file mapping visualization

### Advanced Diagram Types
- **Sankey Diagrams**: Data flow visualization
- **Sunburst Charts**: Hierarchical code structure
- **Network Graphs**: Component relationships
- **Timeline Charts**: Development progression
- **Scatter Plots**: Complexity vs. size analysis

## 🛠️ Development

### Project Structure
```
repo-auditor/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── controllers/     # API route controllers
│   │   ├── services/        # Business logic and analysis services
│   │   ├── config/          # Configuration management
│   │   ├── types/           # TypeScript type definitions
│   │   └── middleware/      # Express middleware
│   ├── server.ts           # Main server entry point
│   └── package.json
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services and utilities
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── package.json
├── .github/workflows/       # CI/CD configuration
└── README.md
```

### Key Services & Components

#### Backend Services
- **BackendAnalysisService**: Core analysis engine with multi-language support
- **AdvancedAnalysisService**: AI-powered analysis features
- **LLMService**: Multi-provider LLM integration (OpenAI, Claude, Gemini)
- **GitHubService**: GitHub API integration and repository analysis
- **CacheService**: Response caching and performance optimization

#### Frontend Components
- **Dashboard**: Main analysis dashboard with real-time updates
- **Interactive Diagrams**: 15+ chart types using D3.js, Recharts, Cytoscape
- **Settings Modal**: LLM provider configuration and testing
- **Progress Tracking**: Real-time analysis progress with Server-Sent Events
- **Error Boundaries**: Comprehensive error handling and recovery

### Build & Test

```bash
# Backend
cd backend
npm run build        # Build TypeScript
npm run dev          # Development server with hot reload
npm test             # Run unit tests (setup included)

# Frontend  
cd frontend
npm run build        # Production build
npm run dev          # Development server
npm run preview      # Preview production build
npm test             # Run tests (setup included)
```

### Production Deployment

#### Using Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build individual containers
docker build -t repo-auditor-backend ./backend
docker build -t repo-auditor-frontend ./frontend
```

#### Manual Deployment
```bash
# 1. Build both applications
cd backend && npm run build
cd ../frontend && npm run build

# 2. Serve frontend static files
# Serve ./frontend/dist with your web server

# 3. Run backend server
cd backend && npm start

# 4. Configure reverse proxy (nginx/Apache) to:
#    - Serve frontend at /
#    - Proxy /api/* to backend server
```

## 🔒 Security & Privacy

### Data Privacy
- **No Data Storage**: Analysis data is processed in memory and not persisted
- **Local Processing**: All analysis happens on your infrastructure
- **API Keys**: User-provided, stored locally in browser only
- **Open Source**: Full transparency - audit the code yourself

### Security Features
- **Input Validation**: Comprehensive validation of all inputs
- **Rate Limiting**: Built-in protection against API abuse
- **Error Sanitization**: Sensitive information not exposed in errors
- **CORS Configuration**: Proper cross-origin request handling
- **Dependency Scanning**: Regular vulnerability assessments

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the test suite
5. Submit a pull request

### Code Standards
- **TypeScript**: Strict typing required
- **ESLint**: Code linting and formatting
- **Testing**: Unit tests for new features
- **Documentation**: Update README for new features

### Areas for Contribution
- **Language Support**: Add parsers for new programming languages
- **Visualizations**: Create new chart types and interactive diagrams
- **Analysis Algorithms**: Improve complexity and architecture detection
- **LLM Providers**: Add support for additional AI providers
- **Performance**: Optimize analysis speed and memory usage

## 📈 Roadmap

### Completed ✅
- Multi-language code analysis engine
- AI integration with multiple LLM providers
- Advanced visualizations and interactive diagrams
- Real-time progress tracking
- Comprehensive error handling
- Production-ready architecture

### Upcoming Features 🔄
- **Team Analytics**: Multi-repository team insights
- **Historical Tracking**: Repository evolution over time
- **Custom Rules**: User-defined analysis patterns
- **Plugin System**: Extensible analysis modules
- **API Documentation**: Auto-generated API docs
- **Performance Benchmarking**: Repository performance comparisons

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Open Source Libraries**: React, D3.js, Express, TypeScript, and many others
- **AI Providers**: OpenAI, Anthropic, and Google for making powerful models accessible
- **Community**: Contributors and users who make this project better

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/repo-auditor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/repo-auditor/discussions)
- **Documentation**: [Wiki](https://github.com/your-org/repo-auditor/wiki)

---

**Made with ❤️ by the open source community**
