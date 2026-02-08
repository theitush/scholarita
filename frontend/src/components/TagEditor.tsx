import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { TagColorPicker } from './TagColorPicker';
import { useAppStore } from '../stores/appStore';

interface TagEditorProps {
  paperId: string;
  currentTags: string[];
  allTags: string[];
  onClose: () => void;
  onSave: (tags: string[]) => void;
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f59e0b', // Amber
];

export const TagEditor: React.FC<TagEditorProps> = ({
  paperId,
  currentTags,
  allTags,
  onClose,
  onSave,
}) => {
  const { config, setConfig } = useAppStore();
  const [tags, setTags] = useState<string[]>(currentTags);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTagColor, setEditingTagColor] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Update suggestions based on input
    if (inputValue.trim()) {
      const filtered = allTags
        .filter(tag =>
          tag.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(tag)
        )
        .slice(0, 5);
      setSuggestions(filtered);
      setSelectedSuggestionIndex(-1);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, allTags, tags]);

  const addTag = async (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setInputValue('');
      setSuggestions([]);

      // Assign random color to new tags (tags not in allTags)
      if (!allTags.includes(trimmedTag) && config) {
        const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
        const updatedTagColors = { ...config.tag_colors, [trimmedTag]: randomColor };
        const updatedConfig = { ...config, tag_colors: updatedTagColors };

        try {
          await api.updateConfig(updatedConfig);
          setConfig(updatedConfig);
        } catch (error) {
          console.error('Failed to assign color to new tag:', error);
        }
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions.length > 0) {
        // Add selected suggestion
        addTag(suggestions[selectedSuggestionIndex]);
      } else if (inputValue.trim()) {
        // Add new tag
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
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag if input is empty
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleTagColorChange = async (tag: string, color: string) => {
    if (!config) return;

    const updatedTagColors = { ...config.tag_colors };
    if (color) {
      updatedTagColors[tag] = color;
    } else {
      delete updatedTagColors[tag];
    }

    const updatedConfig = { ...config, tag_colors: updatedTagColors };

    try {
      await api.updateConfig(updatedConfig);
      setConfig(updatedConfig);
    } catch (error) {
      console.error('Failed to update tag color:', error);
      alert('Failed to update tag color. Please try again.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateTags(paperId, tags);
      onSave(tags);
    } catch (error) {
      console.error('Failed to save tags:', error);
      alert('Failed to save tags. Please try again.');
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
      <div className="tag-editor-modal">
        <div className="modal-header">
          <h3>Edit Tags</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="tag-editor-input-container">
            <div className="tag-editor-tags">
              {tags.map(tag => {
                const tagColor = config?.tag_colors?.[tag];
                return (
                  <div key={tag} className="tag-with-color-picker">
                    <span
                      className="tag tag-editable"
                      style={tagColor ? {
                        backgroundColor: tagColor,
                        color: '#fff',
                        borderColor: tagColor
                      } : undefined}
                    >
                      {tag}
                      <button
                        className="tag-remove"
                        onClick={() => removeTag(tag)}
                        title="Remove tag"
                      >
                        ×
                      </button>
                    </span>
                    <button
                      type="button"
                      className="tag-color-btn"
                      onClick={() => setEditingTagColor(editingTagColor === tag ? null : tag)}
                      title="Change color"
                    >
                      🎨
                    </button>
                    {editingTagColor === tag && (
                      <div className="tag-color-picker-container">
                        <TagColorPicker
                          currentColor={tagColor}
                          onColorSelect={(color) => {
                            handleTagColorChange(tag, color);
                            setEditingTagColor(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <input
                ref={inputRef}
                type="text"
                className="tag-editor-input"
                placeholder={tags.length === 0 ? "Type to add tags..." : ""}
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
            Press <kbd>Enter</kbd> to add, <kbd>Backspace</kbd> to remove, <kbd>Esc</kbd> to close
          </div>

          {allTags.length > 0 && (
            <div className="all-tags-section">
              <div className="all-tags-title">All Tags:</div>
              <div className="all-tags-list">
                {allTags.map(tag => {
                  const tagColor = config?.tag_colors?.[tag];
                  const isAdded = tags.includes(tag);
                  return (
                    <span
                      key={tag}
                      className={`tag ${isAdded ? 'tag-disabled' : 'tag-clickable'}`}
                      style={tagColor ? {
                        backgroundColor: tagColor,
                        color: '#fff',
                        borderColor: tagColor,
                        opacity: isAdded ? 0.5 : 1,
                        cursor: isAdded ? 'default' : 'pointer'
                      } : {
                        opacity: isAdded ? 0.5 : 1,
                        cursor: isAdded ? 'default' : 'pointer'
                      }}
                      onClick={() => !isAdded && addTag(tag)}
                      title={isAdded ? 'Already added' : 'Click to add'}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
