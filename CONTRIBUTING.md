# Contributing to Repo Auditor

Thank you for your interest in contributing to Repo Auditor! We welcome contributions from developers of all skill levels.

## 🎯 Ways to Contribute

### 🐛 Bug Reports
- Use the [issue tracker](https://github.com/your-org/repo-auditor/issues) to report bugs
- Include clear reproduction steps and environment details
- Check if the issue already exists before creating a new one

### 💡 Feature Requests
- Propose new features through [GitHub Discussions](https://github.com/your-org/repo-auditor/discussions)
- Describe the use case and expected behavior
- Consider if the feature aligns with our "bring your own key" philosophy

### 🔧 Code Contributions
- Fix bugs, improve performance, add features
- Enhance documentation and examples
- Improve test coverage
- Add support for new LLM providers

### 📚 Documentation
- Improve README and setup instructions
- Write tutorials and guides
- Fix typos and unclear explanations
- Add code examples

## 🚀 Getting Started

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/repo-auditor.git
   cd repo-auditor
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Set up environment**
   ```bash
   cd backend
   cp .env.example .env
   # Add your LLM API keys for testing (optional)
   ```

4. **Start development servers**
   ```bash
   # From project root
   npm run dev
   ```

### Project Structure

```
repo-auditor/
├── backend/                    # Node.js + Express backend
│   ├── src/
│   │   ├── services/          # Core analysis services
│   │   │   ├── analysisService.ts      # Main analysis orchestrator
│   │   │   ├── llmService.ts           # LLM integration
│   │   │   ├── githubService.ts        # GitHub API integration
│   │   │   └── advancedAnalysisService.ts # Advanced analysis features
│   │   ├── types/             # TypeScript type definitions
│   │   ├── config/            # Configuration files
│   │   └── middleware/        # Express middleware
│   ├── server.ts              # Express server entry point
│   └── package.json
├── frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ui/            # Reusable UI components
│   │   │   ├── diagrams/      # Visualization components
│   │   │   └── report/        # Report page components
│   │   ├── pages/             # Main application pages
│   │   ├── services/          # Frontend services and API calls
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Utility functions
│   └── package.json
└── docs/                      # Documentation and guides
```

## 🛠️ Development Guidelines

### Code Style
- **TypeScript**: Use strict mode and provide proper types
- **ESLint**: Follow the configured linting rules
- **Prettier**: Use consistent formatting
- **Comments**: Add JSDoc comments for functions and complex logic

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for Claude 3.5 Sonnet
fix: resolve memory leak in diagram rendering
docs: update installation instructions
test: add unit tests for LLM service
```

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Testing
- Write unit tests for new features
- Ensure existing tests pass
- Test with different LLM providers
- Test with various repository types

## 🔍 Areas for Contribution

### High Priority
- **LLM Provider Support**: Add new providers (Ollama, local models)
- **Performance**: Optimize analysis for large repositories
- **Mobile Responsiveness**: Improve mobile UI/UX
- **Accessibility**: Add ARIA labels and keyboard navigation

### Medium Priority
- **Language Support**: Add analysis for more programming languages
- **Export Features**: Add PDF/CSV export options
- **Caching**: Implement analysis result caching
- **Plugins**: Create a plugin system for custom analysis

### Low Priority
- **Themes**: Add dark/light theme support
- **Internationalization**: Add multi-language support
- **Docker**: Create Docker deployment options
- **CI/CD**: Improve build and deployment pipelines

## 🧪 Testing Your Changes

### Backend Testing
```bash
cd backend
npm run test
npm run build  # Ensure TypeScript compiles
```

### Frontend Testing
```bash
cd frontend
npm run test
npm run build  # Ensure production build works
```

### Integration Testing
1. Start both frontend and backend
2. Test with different repository types:
   - Small repositories (< 100 files)
   - Large repositories (> 1000 files)
   - Different languages (JavaScript, Python, Java, etc.)
3. Test with and without LLM API keys
4. Test different LLM providers

## 📝 Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following the guidelines above
3. **Write or update tests** as appropriate
4. **Update documentation** if needed
5. **Test thoroughly** including edge cases
6. **Submit a pull request** with:
   - Clear description of changes
   - Link to related issues
   - Screenshots for UI changes
   - Testing steps

### PR Template
```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Tested with different LLM providers
- [ ] Tested with various repository types

## Screenshots (if applicable)

## Related Issues
Fixes #123
```

## 🤝 Community Guidelines

### Be Respectful
- Use inclusive language
- Be constructive in feedback
- Help newcomers get started
- Respect different opinions and approaches

### Be Collaborative
- Discuss major changes before implementing
- Review others' pull requests
- Share knowledge and best practices
- Help maintain project quality

### Be Patient
- Open source development takes time
- Maintainers are volunteers
- Not all features may be accepted
- Focus on the project's core mission

## 🏷️ Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements to docs
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `question` - Further information requested
- `wontfix` - This will not be worked on

## 🎉 Recognition

Contributors will be:
- Listed in the project README
- Mentioned in release notes
- Given credit in relevant documentation
- Invited to the contributors team (after multiple contributions)

## 📧 Getting Help

- **Questions**: Use [GitHub Discussions](https://github.com/your-org/repo-auditor/discussions)
- **Chat**: Join our [Discord server](https://discord.gg/repo-auditor)
- **Email**: Contact maintainers at maintainers@repo-auditor.dev

Thank you for contributing to Repo Auditor! 🚀
