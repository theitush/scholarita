import React, { useState } from 'react';
import { Paper, Highlight } from '../types';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';

interface AnnotationPanelProps {
  paper: Paper;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ paper }) => {
  const { annotationPanelCollapsed, annotationPanelHeight, toggleAnnotationPanel, setCurrentPaper } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'current'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');

  const highlights = paper.highlights || [];

  const groupedHighlights = highlights.reduce((acc, hl) => {
    if (!acc[hl.page]) {
      acc[hl.page] = [];
    }
    acc[hl.page].push(hl);
    return acc;
  }, {} as Record<number, Highlight[]>);

  const sortedPages = Object.keys(groupedHighlights).map(Number).sort((a, b) => a - b);

  const handleEditText = async (highlightId: string) => {
    try {
      await api.updateHighlight(paper.id, highlightId, { text: editComment });

      // Refresh paper
      if ((window as any).refreshPaper) {
        await (window as any).refreshPaper(paper.id);
      } else {
        const updatedPaper = await api.getPaper(paper.id);
        setCurrentPaper(updatedPaper);
      }

      setEditingId(null);
      setEditComment('');
    } catch (err) {
      console.error('Error updating pin:', err);
      alert('Failed to update pin');
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!confirm('Delete this highlight?')) return;

    try {
      await api.deleteHighlight(paper.id, highlightId);

      // Refresh paper
      if ((window as any).refreshPaper) {
        await (window as any).refreshPaper(paper.id);
      } else {
        const updatedPaper = await api.getPaper(paper.id);
        setCurrentPaper(updatedPaper);
      }
    } catch (err) {
      console.error('Error deleting highlight:', err);
      alert('Failed to delete highlight');
    }
  };

  const startEdit = (highlight: Highlight) => {
    setEditingId(highlight.id);
    setEditComment(highlight.text || '');
  };

  return (
    <div
      className={`annotation-panel ${annotationPanelCollapsed ? 'collapsed' : ''}`}
      style={{ height: annotationPanelCollapsed ? '30px' : `${annotationPanelHeight}px` }}
    >
      <div className="annotation-panel-header" onClick={toggleAnnotationPanel}>
        <span>{highlights.length} pins</span>
        <span>{annotationPanelCollapsed ? '▲' : '▼'}</span>
      </div>

      {!annotationPanelCollapsed && (
        <>
          <div style={{ padding: '0.5rem', borderBottom: '1px solid #eee', display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${filter === 'all' ? '' : 'btn-secondary'}`}
              onClick={() => setFilter('all')}
              style={{ padding: '0.25rem 0.5rem', fontSize: '12px' }}
            >
              All pins
            </button>
            <button
              className={`btn ${filter === 'current' ? '' : 'btn-secondary'}`}
              onClick={() => setFilter('current')}
              style={{ padding: '0.25rem 0.5rem', fontSize: '12px' }}
            >
              Current page
            </button>
          </div>

          <div className="annotation-panel-content">
            {highlights.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
                No pins yet. Right-click on the PDF to add a pin.
              </div>
            ) : (
              sortedPages.map(page => (
                <div key={page} style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '0.5rem', color: '#666' }}>
                    Page {page}
                  </div>
                  {groupedHighlights[page].map(hl => (
                    <div key={hl.id} className="annotation-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '3px',
                              background: hl.color,
                              opacity: 0.6
                            }}
                          />
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(hl.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => startEdit(hl)}
                            style={{ fontSize: '11px', padding: '0.15rem 0.4rem', cursor: 'pointer' }}
                            title="Edit pin text"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteHighlight(hl.id)}
                            style={{ fontSize: '11px', padding: '0.15rem 0.4rem', cursor: 'pointer' }}
                            title="Delete pin"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', marginBottom: '0.25rem' }}>
                        "{hl.text.slice(0, 150)}{hl.text.length > 150 ? '...' : ''}"
                      </div>
                      {editingId === hl.id ? (
                        <div style={{ marginTop: '0.5rem' }}>
                          <textarea
                            className="comment-input"
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setEditingId(null);
                                setEditComment('');
                              }
                            }}
                            placeholder="Edit pin text"
                            rows={3}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <button
                              className="btn"
                              onClick={() => handleEditText(hl.id)}
                              style={{ fontSize: '12px', padding: '0.25rem 0.5rem' }}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => {
                                setEditingId(null);
                                setEditComment('');
                              }}
                              style={{ fontSize: '12px', padding: '0.25rem 0.5rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
