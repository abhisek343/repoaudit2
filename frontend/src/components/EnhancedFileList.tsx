import React, { useState, useMemo, useCallback } from 'react';
import { FileText, Search, Filter, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { FileInfo } from '../types';
import { formatLargeNumber, PERFORMANCE_LIMITS } from '../utils/performanceOptimization';

interface EnhancedFileListProps {
  files: FileInfo[];
  title?: string;
}

type SortOption = 'name' | 'complexity' | 'size' | 'type';
type FilterOption = 'all' | 'high-complexity' | 'large-files' | 'source-files';

export const EnhancedFileList: React.FC<EnhancedFileListProps> = ({ 
  files, 
  title = "File Analysis"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('complexity');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showAll, setShowAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Debounced search function
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  // Filter and sort files
  const processedFiles = useMemo(() => {
    let filtered = files;

    // Apply filters
    switch (filterBy) {
      case 'high-complexity':
        filtered = files.filter(f => (f.complexity || 0) > 10);
        break;
      case 'large-files':
        filtered = files.filter(f => (f.size || 0) > 10000);
        break;
      case 'source-files':
        filtered = files.filter(f => f.content && f.language && f.language !== 'text');
        break;
      default:
        filtered = files;
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.language || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort files
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'complexity':
        filtered.sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
        break;
      case 'size':
        filtered.sort((a, b) => (b.size || 0) - (a.size || 0));
        break;
      case 'type':
        filtered.sort((a, b) => (a.language || '').localeCompare(b.language || ''));
        break;
    }

    return filtered;
  }, [files, searchTerm, sortBy, filterBy]);

  // Pagination
  const totalPages = Math.ceil(processedFiles.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentFiles = showAll ? processedFiles : processedFiles.slice(startIndex, endIndex);

  // Check if optimization is needed
  const needsOptimization = files.length > PERFORMANCE_LIMITS.MAX_FILE_LIST_DISPLAY;

  const getComplexityColor = (complexity: number) => {
    if (complexity > 20) return 'text-red-600 bg-red-50';
    if (complexity > 10) return 'text-orange-600 bg-orange-50';
    if (complexity > 5) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getFileIcon = (language: string | undefined) => {
    switch (language?.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        return '📄';
      case 'python':
        return '🐍';
      case 'java':
        return '☕';
      case 'go':
        return '🐹';
      case 'rust':
        return '🦀';
      case 'cpp':
      case 'c':
        return '⚙️';
      default:
        return '📄';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FileText className="w-6 h-6 text-indigo-600 mr-3" />
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {formatLargeNumber(files.length)} files
          </span>
        </div>
        {needsOptimization && (
          <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span className="text-sm">Large repository - optimized view</span>
          </div>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />          <input
            type="text"
            placeholder="Search files..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <select
            value={filterBy}
            onChange={(e) => {
              setFilterBy(e.target.value as FilterOption);
              setCurrentPage(1);
            }}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Files</option>
            <option value="source-files">Source Files Only</option>
            <option value="high-complexity">High Complexity</option>
            <option value="large-files">Large Files</option>
          </select>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortOption);
            setCurrentPage(1);
          }}
          className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="complexity">Sort by Complexity</option>
          <option value="size">Sort by Size</option>
          <option value="name">Sort by Name</option>
          <option value="type">Sort by Type</option>
        </select>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-600">
          Showing {currentFiles.length} of {formatLargeNumber(processedFiles.length)} files
          {searchTerm && ` matching "${searchTerm}"`}
        </span>
        {!showAll && processedFiles.length > pageSize && (
          <button
            onClick={() => setShowAll(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            Show all results
            <ChevronDown className="w-4 h-4 ml-1" />
          </button>
        )}
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            Show paginated
            <ChevronUp className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>

      {/* File List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {currentFiles.map((file, index) => (
          <div 
            key={`${file.path}-${index}`}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <span className="text-lg mr-2">{getFileIcon(file.language)}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{file.name}</div>
                  <div className="text-sm text-gray-500 truncate">{file.path}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 flex-shrink-0">
              {/* Language */}
              {file.language && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {file.language}
                </span>
              )}
              
              {/* Complexity */}
              {file.complexity !== undefined && file.complexity > 0 && (
                <span className={`px-2 py-1 text-xs rounded-full ${getComplexityColor(file.complexity)}`}>
                  {file.complexity.toFixed(1)}
                </span>
              )}
              
              {/* Size */}
              {file.size && (
                <span className="text-xs text-gray-500">
                  {formatLargeNumber(file.size)} bytes
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {!showAll && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* No results */}
      {processedFiles.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No files found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedFileList;
