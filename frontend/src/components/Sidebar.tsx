import React, { useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import { PaperMetadata } from '../types';

export const Sidebar: React.FC = () => {
  const {
    papers,
    filterText,
    tagFilter,
    selectedPaperIds,
    sidebarCollapsed,
    setFilterText,
    togglePaperSelection,
    addTab,
  } = useAppStore();

  const filteredPapers = useMemo(() => {
    return papers.filter(paper => {
      // Text filter
      if (filterText) {
        const searchText = filterText.toLowerCase();
        const matchesText =
          paper.title.toLowerCase().includes(searchText) ||
          paper.authors.some(a => a.name.toLowerCase().includes(searchText)) ||
          paper.tags.some(t => t.toLowerCase().includes(searchText));
        if (!matchesText) return false;
      }

      // Tag filter
      if (tagFilter.length > 0) {
        const hasTag = tagFilter.some(tag => paper.tags.includes(tag));
        if (!hasTag) return false;
      }

      return true;
    });
  }, [papers, filterText, tagFilter]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    papers.forEach(paper => {
      paper.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [papers]);

  const handlePaperClick = (paper: PaperMetadata, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      togglePaperSelection(paper.id);
    } else {
      addTab({
        id: `paper-${paper.id}`,
        type: 'paper',
        title: paper.title.slice(0, 30) + (paper.title.length > 30 ? '...' : ''),
        paperId: paper.id,
      });
    }
  };

  if (sidebarCollapsed) {
    return null;
  }

  return (
    <div className="sidebar">
      <div className="sidebar-filter">
        <input
          type="text"
          className="filter-input"
          placeholder="Filter papers..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      <div className="paper-list">
        {filteredPapers.length === 0 ? (
          <div className="empty-state">
            {papers.length === 0 ? 'No papers yet. Import your first paper!' : 'No papers match current filters'}
          </div>
        ) : (
          filteredPapers.map(paper => (
            <div
              key={paper.id}
              className={`paper-item ${selectedPaperIds.includes(paper.id) ? 'selected' : ''}`}
              onClick={(e) => handlePaperClick(paper, e)}
            >
              <div className="paper-title">
                {paper.title}
              </div>
              <div className="paper-meta">
                {paper.authors[0]?.name || 'Unknown'}{paper.authors.length > 1 ? ' et al.' : ''} • {paper.year || 'n/a'}
              </div>
              {paper.tags.length > 0 && (
                <div className="paper-tags">
                  {paper.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {allTags.length > 0 && (
        <div style={{ padding: '0.75rem', borderTop: '1px solid #eee' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '0.5rem' }}>All Tags:</div>
          <div className="paper-tags">
            {allTags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
