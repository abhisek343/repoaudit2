import React, { useState, useMemo } from 'react';
import { 
  GitCommit, 
  Users, 
  Calendar,
  Filter
} from 'lucide-react';
import GitHistoryVisualization from '../components/diagrams/GitHistoryVisualization';
import { AnalysisResult, Commit } from '../types';

interface GitHistoryPageProps {
  analysisResult: AnalysisResult;
}

const GitHistoryPage: React.FC<GitHistoryPageProps> = ({ analysisResult: reportData }) => {
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');

  const authors = useMemo(() => {
    if (!reportData?.commits) return [];
    const authorNames = new Set<string>();
    reportData.commits.forEach(c => {
      if (c.author?.login) {
        authorNames.add(c.author.login);
      } else if (c.commit?.author?.name) {
        authorNames.add(c.commit.author.name);
      }
    });
    return Array.from(authorNames).sort();
  }, [reportData.commits]);

  const filteredCommits = useMemo(() => {
    if (!reportData?.commits) return [];

    let commits = reportData.commits.filter((c): c is Commit => !!(c && c.commit && c.commit.author && c.commit.author.date));

    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (timeFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      } else if (timeFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      }
      commits = commits.filter(commit => new Date(commit.commit.author.date) >= cutoff);
    }

    if (authorFilter !== 'all') {
      commits = commits.filter(commit => {
        const login = commit.author?.login;
        const name = commit.commit?.author?.name;
        const filter = authorFilter.toLowerCase();
        
        if (login && login.toLowerCase() === filter) {
          return true;
        }
        if (name && name.toLowerCase() === filter) {
          return true;
        }
        return false;
      });
    }

    return commits;
  }, [reportData.commits, timeFilter, authorFilter]);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Git History Filters</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as 'all' | 'month' | 'week')}
                className="rounded-lg border-gray-300 text-sm"
              >
                <option value="all">All Time</option>
                <option value="month">Last Month</option>
                <option value="week">Last Week</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-600" />
              <select
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className="rounded-lg border-gray-300 text-sm"
              >
                <option value="all">All Authors</option>
                {authors.map(author => (
                  <option key={author} value={author}>
                    {author}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <GitHistoryVisualization
          commits={filteredCommits}
          contributors={reportData.contributors || []}
          onCommitSelect={(commit) => {
            console.log('Selected commit:', commit);
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <GitCommit className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Total Commits</h3>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {reportData.metrics.totalCommits}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Contributors</h3>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {reportData.metrics.totalContributors}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Time Span</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {filteredCommits.length > 0 ? (
                <>
                  {new Date(filteredCommits[filteredCommits.length - 1].commit.author.date).toLocaleDateString()} -{' '}
                  {new Date(filteredCommits[0].commit.author.date).toLocaleDateString()}
                </>
              ) : (
                'N/A'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHistoryPage;
