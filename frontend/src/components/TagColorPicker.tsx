import React, { useState } from 'react';

interface TagColorPickerProps {
  currentColor?: string;
  onColorSelect: (color: string) => void;
}

const PRESET_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Amber', value: '#f59e0b' },
];

export const TagColorPicker: React.FC<TagColorPickerProps> = ({
  currentColor = '',
  onColorSelect,
}) => {
  const [customColor, setCustomColor] = useState(currentColor);

  const handlePresetClick = (color: string) => {
    onColorSelect(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onColorSelect(color);
  };

  return (
    <div className="tag-color-picker">
      <div className="color-picker-dropdown">
        <div className="color-picker-header">Tag Color</div>

        <div className="preset-colors">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`preset-color-btn ${currentColor === preset.value ? 'selected' : ''}`}
              onClick={() => handlePresetClick(preset.value)}
              title={preset.name}
            >
              <div
                className="preset-color-swatch"
                style={{
                  backgroundColor: preset.value || '#e0e0e0',
                }}
              />
            </button>
          ))}
        </div>

        <div className="custom-color-section">
          <label htmlFor="custom-color-input" className="custom-color-label">
            Custom:
          </label>
          <input
            id="custom-color-input"
            type="color"
            className="custom-color-input"
            value={customColor || '#e0e0e0'}
            onChange={handleCustomColorChange}
          />
        </div>
      </div>
    </div>
  );
};
