import React, { useState, useMemo, ChangeEvent } from 'react';
import { 
  GitCommit, 
  Users, 
  Calendar,
  Filter
} from 'lucide-react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ErrorDisplay from '../components/ui/ErrorDisplay';
import CommitDiffModal from '../components/CommitDiffModal';
import { AnalysisResult, ProcessedCommit as Commit, Contributor } from '../types';

interface GitHistoryPageProps {
  analysisResult: AnalysisResult;
}

const GitHistoryPage: React.FC<GitHistoryPageProps> = ({ analysisResult: reportData }) => {
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [diffSha, setDiffSha] = useState<string>('');
  const [diffModalVisible, setDiffModalVisible] = useState<boolean>(false);

  const authors = useMemo(() => {
    if (!reportData?.commits) return [];
    const authorNames = new Set<string>();
    reportData.commits.forEach(c => {
      const author = c.author;
      // Assuming author can be a string or an object with a login/name property
      const authorName = typeof author === 'string' ? author : (author as Contributor)?.login || (author as { name?: string })?.name;
      if (authorName) {
        authorNames.add(authorName);
      }
    });
    return Array.from(authorNames).sort();
  }, [reportData.commits]);

  const filteredCommits = useMemo(() => {
    if (!reportData?.commits) return [];

    let commits = reportData.commits.filter((c): c is Commit => !!(c && c.date)); // Check for c.date for ProcessedCommit

    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (timeFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      } else if (timeFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      }
      commits = commits.filter(commit => new Date(commit.date) >= cutoff);
    }

    if (authorFilter !== 'all') {
      commits = commits.filter(commit => {
        const author = commit.author;
        const authorName = typeof author === 'string' ? author : (author as Contributor)?.login || (author as { name?: string })?.name;
        const filter = authorFilter.toLowerCase();
        
        if (authorName && authorName.toLowerCase() === filter) {
          return true;
        }
        return false;
      });
    }

    return commits;
  }, [reportData.commits, timeFilter, authorFilter]);

  // Apply search filter
  const displayedCommits = useMemo(() => {
    return filteredCommits.filter(c =>
      c.message.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [filteredCommits, searchText]);

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
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setTimeFilter(e.target.value as 'all' | 'month' | 'week')}
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
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setAuthorFilter(e.target.value)}
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
        {/* Search field */}
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <input
            type="text"
            placeholder="Search commit messages..."
            value={searchText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            className="flex-1 rounded-lg border-gray-300 p-2 text-sm"
          />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900">Commit List</h3>
          {displayedCommits.length > 0 ? (
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Additions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deletions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Files</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedCommits
                    .slice()
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(c => {
                      const isOpen = expanded.has(c.sha);
                      return (
                        <>
                          <tr key={c.sha} onClick={() => {
                            const newSet = new Set(expanded);
                            if (isOpen) {
                              newSet.delete(c.sha);
                            } else {
                              newSet.add(c.sha);
                            }
                            setExpanded(newSet);
                          }} className="cursor-pointer">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(c.date).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{typeof c.author === 'string' ? c.author : (c.author as Contributor).login || ''}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.message}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.stats?.additions ?? '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.stats?.deletions ?? '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.files?.length ?? 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {isOpen ? <ChevronUp /> : <ChevronDown />}
                            </td>
                          </tr>
                          {isOpen && c.files && (
                            <tr>
                              <td colSpan={7} className="bg-gray-50 px-6 py-2">
                                <ul className="list-disc list-inside text-sm">
                                  {c.files.map(f => (
                                    <li key={f.filename}>{f.filename} (+{f.additions}/-{f.deletions})</li>
                                  ))}
                                </ul>
                                <div className="mt-2 flex space-x-4 text-xs">
                                  <a
                                    href={`${reportData.repositoryUrl}/commit/${c.sha}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline"
                                  >GitHub&nbsp;Diff</a>
                                  <button
                                    onClick={() => { setDiffSha(c.sha); setDiffModalVisible(true); }}
                                    className="text-indigo-600 hover:underline"
                                  >View&nbsp;Inline&nbsp;Diff</button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <ErrorDisplay message="No commits for selected filters." />
          )}
        </div>

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
                  {new Date(filteredCommits[filteredCommits.length - 1].date).toLocaleDateString()} -{' '}
                  {new Date(filteredCommits[0].date).toLocaleDateString()}
                </>
              ) : (
                'N/A'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Diff Modal */}
      <CommitDiffModal
        sha={diffSha}
        repoUrl={reportData.repositoryUrl}
        visible={diffModalVisible}
        onClose={() => setDiffModalVisible(false)}
      />
    </div>
  );
};

export default GitHistoryPage;
