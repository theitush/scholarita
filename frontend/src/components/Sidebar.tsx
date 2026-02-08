import React, { useMemo, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { PaperMetadata } from '../types';
import { TagEditor } from './TagEditor';
import { BulkTagEditor } from './BulkTagEditor';
import { api } from '../services/api';

export const Sidebar: React.FC = () => {
  const {
    papers,
    filterText,
    tagFilter,
    selectedPaperIds,
    sidebarCollapsed,
    config,
    setFilterText,
    setTagFilter,
    togglePaperSelection,
    setSelectedPaperIds,
    addTab,
    setPapers,
    updatePaperInList,
  } = useAppStore();

  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [showBulkTagEditor, setShowBulkTagEditor] = useState(false);

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

  const handleTagClick = (tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    // Toggle tag filter
    if (tagFilter.includes(tag)) {
      setTagFilter(tagFilter.filter(t => t !== tag));
    } else {
      setTagFilter([...tagFilter, tag]);
    }
  };

  const handleTagEdit = (paperId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingPaperId(paperId);
  };

  const handleTagSave = async (paperId: string, tags: string[]) => {
    // Update the paper in the list
    const paper = papers.find(p => p.id === paperId);
    if (paper) {
      updatePaperInList({ ...paper, tags });
    }
    setEditingPaperId(null);
  };

  const handleBulkTagClick = () => {
    if (selectedPaperIds.length > 0) {
      setShowBulkTagEditor(true);
    }
  };

  const handleBulkTagSuccess = async () => {
    // Refresh the paper list
    const updatedPapers = await api.getPapers();
    setPapers(updatedPapers);
    setShowBulkTagEditor(false);
    setSelectedPaperIds([]);
  };

  const clearTagFilter = () => {
    setTagFilter([]);
  };

  const clearSelection = () => {
    setSelectedPaperIds([]);
  };

  const getTagStyle = (tag: string, isActive: boolean = false) => {
    const tagColor = config?.tag_colors?.[tag];
    if (!tagColor) return undefined;

    if (isActive) {
      // Active tags should have darker background
      return {
        backgroundColor: tagColor,
        color: '#fff',
        borderColor: tagColor,
        fontWeight: 500 as const
      };
    }

    return {
      backgroundColor: tagColor,
      color: '#fff',
      borderColor: tagColor
    };
  };

  if (sidebarCollapsed) {
    return null;
  }

  const editingPaper = papers.find(p => p.id === editingPaperId);

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

      {/* Active tag filters */}
      {tagFilter.length > 0 && (
        <div className="active-tag-filters">
          <div className="filter-label">
            Filtered by:
            <button className="clear-filters-btn" onClick={clearTagFilter} title="Clear tag filters">
              Clear all
            </button>
          </div>
          <div className="paper-tags">
            {tagFilter.map(tag => (
              <span
                key={tag}
                className="tag tag-filter-active"
                style={getTagStyle(tag, true)}
              >
                {tag}
                <button
                  className="tag-remove"
                  onClick={() => handleTagClick(tag, {} as React.MouseEvent)}
                  title="Remove filter"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bulk tag button */}
      {selectedPaperIds.length > 0 && (
        <div className="bulk-actions-bar">
          <span className="selection-count">{selectedPaperIds.length} selected</span>
          <button className="btn btn-small" onClick={handleBulkTagClick}>
            Bulk Tag
          </button>
          <button className="btn btn-small btn-secondary" onClick={clearSelection}>
            Clear
          </button>
        </div>
      )}

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
              <div className="paper-tags-row">
                {paper.tags.length > 0 ? (
                  <div className="paper-tags">
                    {paper.tags.map(tag => (
                      <span
                        key={tag}
                        className={`tag ${tagFilter.includes(tag) ? 'tag-active' : ''}`}
                        style={getTagStyle(tag, tagFilter.includes(tag))}
                        onClick={(e) => handleTagClick(tag, e)}
                        title="Click to filter by this tag"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <button
                  className="tag-edit-btn"
                  onClick={(e) => handleTagEdit(paper.id, e)}
                  title="Edit tags"
                >
                  #
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tag Editor Modal */}
      {editingPaperId && editingPaper && (
        <TagEditor
          paperId={editingPaperId}
          currentTags={editingPaper.tags}
          allTags={allTags}
          onClose={() => setEditingPaperId(null)}
          onSave={(tags) => handleTagSave(editingPaperId, tags)}
        />
      )}

      {/* Bulk Tag Editor Modal */}
      {showBulkTagEditor && (
        <BulkTagEditor
          paperIds={selectedPaperIds}
          paperCount={selectedPaperIds.length}
          allTags={allTags}
          onClose={() => setShowBulkTagEditor(false)}
          onSuccess={handleBulkTagSuccess}
        />
      )}
    </div>
  );
};
