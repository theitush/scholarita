import React, { useState } from 'react';
import { Paper, Highlight } from '../types';
import { useAppStore } from '../stores/appStore';

interface AnnotationPanelProps {
  paper: Paper;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ paper }) => {
  const { annotationPanelCollapsed, annotationPanelHeight, toggleAnnotationPanel } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'current'>('all');

  const highlights = paper.highlights || [];

  const groupedHighlights = highlights.reduce((acc, hl) => {
    if (!acc[hl.page]) {
      acc[hl.page] = [];
    }
    acc[hl.page].push(hl);
    return acc;
  }, {} as Record<number, Highlight[]>);

  const sortedPages = Object.keys(groupedHighlights).map(Number).sort((a, b) => a - b);

  return (
    <div
      className={`annotation-panel ${annotationPanelCollapsed ? 'collapsed' : ''}`}
      style={{ height: annotationPanelCollapsed ? '30px' : `${annotationPanelHeight}px` }}
    >
      <div className="annotation-panel-header" onClick={toggleAnnotationPanel}>
        <span>{highlights.length} highlights</span>
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
              All highlights
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
                No highlights yet. Select text in the PDF to create a highlight.
              </div>
            ) : (
              sortedPages.map(page => (
                <div key={page} style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '0.5rem', color: '#666' }}>
                    Page {page}
                  </div>
                  {groupedHighlights[page].map(hl => (
                    <div key={hl.id} className="annotation-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
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
                      <div style={{ fontSize: '13px', marginBottom: '0.25rem' }}>
                        "{hl.text.slice(0, 150)}{hl.text.length > 150 ? '...' : ''}"
                      </div>
                      {hl.comment && (
                        <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', marginTop: '0.25rem' }}>
                          → {hl.comment}
                        </div>
                      )}
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
