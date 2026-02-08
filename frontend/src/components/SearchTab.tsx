import React, { useEffect, useState } from 'react';
import { SearchResult } from '../types';
import { api } from '../services/api';
import { useAppStore } from '../stores/appStore';

interface SearchTabProps {
  query: string;
}

export const SearchTab: React.FC<SearchTabProps> = ({ query }) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addTab } = useAppStore();

  useEffect(() => {
    const performSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.search(query);
        setResults(response.results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    addTab({
      id: `paper-${result.paper_id}`,
      type: 'paper',
      title: result.title.slice(0, 30) + (result.title.length > 30 ? '...' : ''),
      paperId: result.paper_id,
    });
  };

  if (loading) {
    return (
      <div className="search-tab">
        <div className="search-header">
          <h2>Searching for: {query}</h2>
        </div>
        <div className="search-loading">Searching...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-tab">
        <div className="search-header">
          <h2>Searching for: {query}</h2>
        </div>
        <div className="search-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="search-tab">
      <div className="search-header">
        <h2>Search results for: {query}</h2>
        <div className="search-count">{results.length} result{results.length !== 1 ? 's' : ''}</div>
      </div>

      {results.length === 0 ? (
        <div className="search-empty">
          No results found. Try different keywords or check your spelling.
        </div>
      ) : (
        <div className="search-results">
          {results.map((result) => (
            <div
              key={result.paper_id}
              className="search-result-item"
              onClick={() => handleResultClick(result)}
            >
              <div className="search-result-header">
                <h3 className="search-result-title">{result.title}</h3>
                <span className="search-result-score">Score: {result.score}</span>
              </div>

              <div className="search-result-matches">
                {result.matches.map((match, idx) => (
                  <div key={idx} className="search-match">
                    <span className="search-match-field">{match.field}</span>
                    {match.page && <span className="search-match-page">Page {match.page}</span>}
                    <div
                      className="search-match-snippet"
                      dangerouslySetInnerHTML={{ __html: match.snippet }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
