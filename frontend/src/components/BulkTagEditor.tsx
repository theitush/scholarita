import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

interface BulkTagEditorProps {
  paperIds: string[];
  paperCount: number;
  allTags: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkTagEditor: React.FC<BulkTagEditorProps> = ({
  paperIds,
  paperCount,
  allTags,
  onClose,
  onSuccess,
}) => {
  const [addTags, setAddTags] = useState<string[]>([]);
  const [removeTags, setRemoveTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (inputValue.trim()) {
      const currentList = mode === 'add' ? addTags : removeTags;
      const filtered = allTags
        .filter(tag =>
          tag.toLowerCase().includes(inputValue.toLowerCase()) &&
          !currentList.includes(tag)
        )
        .slice(0, 5);
      setSuggestions(filtered);
      setSelectedSuggestionIndex(-1);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, allTags, addTags, removeTags, mode]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    if (mode === 'add' && !addTags.includes(trimmedTag)) {
      setAddTags([...addTags, trimmedTag]);
    } else if (mode === 'remove' && !removeTags.includes(trimmedTag)) {
      setRemoveTags([...removeTags, trimmedTag]);
    }
    setInputValue('');
    setSuggestions([]);
  };

  const removeTagFromList = (tag: string, list: 'add' | 'remove') => {
    if (list === 'add') {
      setAddTags(addTags.filter(t => t !== tag));
    } else {
      setRemoveTags(removeTags.filter(t => t !== tag));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions.length > 0) {
        addTag(suggestions[selectedSuggestionIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        Math.min(prev + 1, suggestions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSave = async () => {
    if (addTags.length === 0 && removeTags.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await api.bulkTag(paperIds, addTags, removeTags);
      onSuccess();
    } catch (error) {
      console.error('Failed to bulk update tags:', error);
      alert('Failed to update tags. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="tag-editor-modal bulk-tag-editor">
        <div className="modal-header">
          <h3>Bulk Edit Tags ({paperCount} papers)</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Mode Toggle */}
          <div className="bulk-tag-mode-toggle">
            <button
              className={`mode-btn ${mode === 'add' ? 'active' : ''}`}
              onClick={() => setMode('add')}
            >
              Add Tags
            </button>
            <button
              className={`mode-btn ${mode === 'remove' ? 'active' : ''}`}
              onClick={() => setMode('remove')}
            >
              Remove Tags
            </button>
          </div>

          {/* Add Tags Section */}
          {addTags.length > 0 && (
            <div className="bulk-tag-section">
              <div className="bulk-tag-section-title">Tags to Add:</div>
              <div className="tag-editor-tags">
                {addTags.map(tag => (
                  <span key={tag} className="tag tag-editable tag-add">
                    {tag}
                    <button
                      className="tag-remove"
                      onClick={() => removeTagFromList(tag, 'add')}
                      title="Remove from list"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Remove Tags Section */}
          {removeTags.length > 0 && (
            <div className="bulk-tag-section">
              <div className="bulk-tag-section-title">Tags to Remove:</div>
              <div className="tag-editor-tags">
                {removeTags.map(tag => (
                  <span key={tag} className="tag tag-editable tag-remove-item">
                    {tag}
                    <button
                      className="tag-remove-btn"
                      onClick={() => removeTagFromList(tag, 'remove')}
                      title="Remove from list"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="tag-editor-input-container">
            <div className="tag-editor-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="tag-editor-input"
                placeholder={`Type to ${mode === 'add' ? 'add' : 'remove'} tags...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {suggestions.length > 0 && (
              <div className="tag-suggestions">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion}
                    className={`tag-suggestion ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                    onClick={() => addTag(suggestion)}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tag-editor-hint">
            Press <kbd>Enter</kbd> to add, <kbd>Esc</kbd> to close
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || (addTags.length === 0 && removeTags.length === 0)}
          >
            {isSaving ? 'Saving...' : `Update ${paperCount} Papers`}
          </button>
        </div>
      </div>
    </div>
  );
};
