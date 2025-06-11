import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  Star, 
  Plus,
  Search,
  Filter,
  Calendar,
  Eye,
  Share2,
  Download,
  Tag,
  Github,
  Home
} from 'lucide-react';
import { SavedReport } from '../types';

const DashboardPage = () => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    // Load saved reports from localStorage
    const reportsFromStorage: SavedReport[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('report_')) {
        try {
          const reportItem = localStorage.getItem(key);
          if (reportItem) {
            const parsedReport = JSON.parse(reportItem);
            // Construct a SavedReport object from the parsed data
            reportsFromStorage.push({
              id: key.replace('report_', ''),
              repositoryName: parsedReport.repository?.fullName || parsedReport.repositoryName || 'Unknown Repo',
              category: parsedReport.category || 'comprehensive',
              createdAt: parsedReport.createdAt || new Date().toISOString(),
              summary: parsedReport.executiveSummary || parsedReport.summary || 'No summary available.',
              tags: parsedReport.tags || [parsedReport.repository?.language || 'general'],
              isPublic: parsedReport.isPublic || false, // Assuming a default
              // Add other fields if necessary, or ensure they are in parsedReport
              userId: parsedReport.userId || 'local',
              repositoryUrl: parsedReport.repositoryUrl || `https://github.com/${parsedReport.repository?.fullName}`,
              lastAccessed: parsedReport.lastAccessed || new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`Failed to parse report ${key}:`, error);
        }
      }
    }
    setReports(reportsFromStorage.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.repositoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || report.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', name: 'All Reports' },
    { id: 'comprehensive', name: 'Comprehensive' },
    { id: 'security', name: 'Security' },
    { id: 'performance', name: 'Performance' },
    { id: 'architecture', name: 'Architecture' }
  ];

  const stats = [
    {
      label: 'Total Reports',
      value: reports.length,
      icon: <BarChart3 className="w-6 h-6 text-blue-500" />,
      change: '+12%'
    },
    {
      label: 'This Month',
      value: reports.filter(r => {
        const reportDate = new Date(r.createdAt);
        const now = new Date();
        return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
      }).length,
      icon: <Calendar className="w-6 h-6 text-green-500" />,
      change: '+8%'
    },
    {
      label: 'Public Reports',
      value: reports.filter(r => r.isPublic).length,
      icon: <Eye className="w-6 h-6 text-purple-500" />,
      change: '+3%'
    },
    {
      label: 'Categories',
      value: new Set(reports.map(r => r.category)).size,
      icon: <Star className="w-6 h-6 text-yellow-500" />,
      change: 'Stable'
    }
  ];

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
                to="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>
              <Link
                to="/analyze"
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
              >
                New Analysis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Analysis Dashboard
          </h1>
          <p className="text-gray-600">
            View and manage your repository analysis reports
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                {stat.icon}
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-gray-600 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Link
              to="/analyze"
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>New Analysis</span>
            </Link>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <div key={report.id} className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {report.repositoryName}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {report.summary}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {report.isPublic && (
                        <Eye className="w-4 h-4 text-green-500" />
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.category === 'security' ? 'bg-red-100 text-red-800' :
                        report.category === 'performance' ? 'bg-yellow-100 text-yellow-800' :
                        report.category === 'architecture' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {report.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {report.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <Link
                      to={`/report/${report.id}`}
                      className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                      View Report →
                    </Link>
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || filterCategory !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Get started by analyzing your first repository'
                  }
                </p>
                <Link
                  to="/analyze"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Your First Report</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
