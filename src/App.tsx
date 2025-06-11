import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import ReportPage from './pages/ReportPage';
import DashboardPage from './pages/DashboardPage';
import GitHistoryPage from './pages/GitHistoryPage';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/report/:repoId" element={<ReportPage />} />
            <Route path="/git-history/:reportId" element={<GitHistoryPage />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
