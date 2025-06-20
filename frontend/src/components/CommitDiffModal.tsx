import React, { useEffect, useState } from 'react';
import ErrorDisplay from './ui/ErrorDisplay';

interface CommitDiffModalProps {
  sha: string;
  repoUrl: string;
  visible: boolean;
  onClose: () => void;
}

const CommitDiffModal: React.FC<CommitDiffModalProps> = ({ sha, repoUrl, visible, onClose }) => {
  const [patch, setPatch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError('');
    fetch(`${repoUrl}/commit/${sha}.patch`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Could not fetch diff: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        setPatch(text);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [visible, sha, repoUrl]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white max-w-3xl w-full h-3/4 overflow-y-auto p-4 rounded-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
        >
          Close
        </button>
        {loading && <p>Loading diff...</p>}
        {error && <ErrorDisplay message={error} />}
        {!loading && !error && (
          <pre className="whitespace-pre text-xs overflow-x-auto">
            {patch}
          </pre>
        )}
      </div>
    </div>
  );
};

export default CommitDiffModal;
