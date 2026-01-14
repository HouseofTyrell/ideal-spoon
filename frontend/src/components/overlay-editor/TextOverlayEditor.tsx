import { useState, useCallback, useMemo } from 'react'
import {
  OverlayText,
  AVAILABLE_FONTS,
  TEXT_VARIABLES,
  TextVariable,
} from '../../types/overlayConfig'

interface TextOverlayEditorProps {
  text: OverlayText
  onChange: (text: OverlayText) => void
  disabled?: boolean
}

function TextOverlayEditor({ text, onChange, disabled = false }: TextOverlayEditorProps) {
  const [inputMode, setInputMode] = useState<'static' | 'variable'>(
    text.content.includes('<<') ? 'variable' : 'static'
  )
  const [showStroke, setShowStroke] = useState(!!text.strokeWidth)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Group variables by category
  const groupedVariables = useMemo(() => {
    const groups: Record<string, TextVariable[]> = {}
    for (const variable of TEXT_VARIABLES) {
      if (!groups[variable.category]) {
        groups[variable.category] = []
      }
      groups[variable.category].push(variable)
    }
    return groups
  }, [])

  const handleContentChange = useCallback(
    (content: string) => {
      onChange({ ...text, content })
    },
    [text, onChange]
  )

  const handleFontChange = useCallback(
    (font: string) => {
      onChange({ ...text, font })
    },
    [text, onChange]
  )

  const handleFontSizeChange = useCallback(
    (fontSize: number) => {
      onChange({ ...text, fontSize: Math.max(8, Math.min(200, fontSize)) })
    },
    [text, onChange]
  )

  const handleFontColorChange = useCallback(
    (fontColor: string) => {
      onChange({ ...text, fontColor })
    },
    [text, onChange]
  )

  const handleFontStyleChange = useCallback(
    (fontStyle: OverlayText['fontStyle']) => {
      onChange({ ...text, fontStyle })
    },
    [text, onChange]
  )

  const handleStrokeColorChange = useCallback(
    (strokeColor: string) => {
      onChange({ ...text, strokeColor })
    },
    [text, onChange]
  )

  const handleStrokeWidthChange = useCallback(
    (strokeWidth: number) => {
      onChange({ ...text, strokeWidth: Math.max(0, Math.min(10, strokeWidth)) })
    },
    [text, onChange]
  )

  const insertVariable = useCallback(
    (variable: TextVariable) => {
      const newContent = inputMode === 'variable' ? variable.variable : text.content + variable.variable
      handleContentChange(newContent)
      setExpandedCategory(null)
    },
    [inputMode, text.content, handleContentChange]
  )

  return (
    <div className="text-overlay-editor">
      {/* Input Mode Toggle */}
      <div className="input-mode-toggle">
        <button
          type="button"
          className={`mode-btn ${inputMode === 'static' ? 'active' : ''}`}
          onClick={() => setInputMode('static')}
          disabled={disabled}
        >
          Static Text
        </button>
        <button
          type="button"
          className={`mode-btn ${inputMode === 'variable' ? 'active' : ''}`}
          onClick={() => setInputMode('variable')}
          disabled={disabled}
        >
          Variable
        </button>
      </div>

      {/* Content Input */}
      <div className="content-section">
        {inputMode === 'static' ? (
          <div className="form-group">
            <label className="form-label">Text Content</label>
            <input
              type="text"
              className="form-input"
              value={text.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Enter text..."
              disabled={disabled}
            />
          </div>
        ) : (
          <div className="variable-selector">
            <label className="form-label">Select Variable</label>
            <div className="variable-preview">
              <code>{text.content || 'No variable selected'}</code>
            </div>
            <div className="variable-categories">
              {Object.entries(groupedVariables).map(([category, variables]) => (
                <div key={category} className="variable-category">
                  <button
                    type="button"
                    className="category-header"
                    onClick={() =>
                      setExpandedCategory(expandedCategory === category ? null : category)
                    }
                    disabled={disabled}
                  >
                    <span>{expandedCategory === category ? '▼' : '▶'}</span>
                    <span>{category}</span>
                    <span className="category-count">{variables.length}</span>
                  </button>
                  {expandedCategory === category && (
                    <div className="variable-list">
                      {variables.map((variable) => (
                        <button
                          key={variable.id}
                          type="button"
                          className={`variable-item ${
                            text.content === variable.variable ? 'selected' : ''
                          }`}
                          onClick={() => insertVariable(variable)}
                          disabled={disabled}
                        >
                          <span className="variable-name">{variable.name}</span>
                          <span className="variable-code">{variable.variable}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Font Settings */}
      <div className="font-section">
        <label className="section-label">Font Settings</label>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Font</label>
            <select
              className="form-select"
              value={text.font}
              onChange={(e) => handleFontChange(e.target.value)}
              disabled={disabled}
            >
              {AVAILABLE_FONTS.map((font) => (
                <option key={font.id} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group size-group">
            <label className="form-label">Size</label>
            <div className="size-input-wrapper">
              <input
                type="number"
                className="form-input size-input"
                value={text.fontSize}
                onChange={(e) => handleFontSizeChange(parseInt(e.target.value) || 45)}
                disabled={disabled}
                min={8}
                max={200}
              />
              <span className="unit">px</span>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                className="color-picker"
                value={text.fontColor}
                onChange={(e) => handleFontColorChange(e.target.value)}
                disabled={disabled}
              />
              <input
                type="text"
                className="form-input color-text"
                value={text.fontColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    handleFontColorChange(e.target.value)
                  }
                }}
                disabled={disabled}
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Style</label>
            <select
              className="form-select"
              value={text.fontStyle || ''}
              onChange={(e) =>
                handleFontStyleChange(e.target.value as OverlayText['fontStyle'] || undefined)
              }
              disabled={disabled}
            >
              <option value="">Normal</option>
              <option value="bold">Bold</option>
              <option value="italic">Italic</option>
              <option value="bold italic">Bold Italic</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stroke/Outline Settings */}
      <div className="stroke-section">
        <div className="section-header">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showStroke}
              onChange={(e) => {
                setShowStroke(e.target.checked)
                if (!e.target.checked) {
                  onChange({ ...text, strokeWidth: undefined, strokeColor: undefined })
                } else {
                  onChange({ ...text, strokeWidth: 2, strokeColor: '#000000' })
                }
              }}
              disabled={disabled}
            />
            <span>Text Outline (Stroke)</span>
          </label>
        </div>

        {showStroke && (
          <div className="form-row stroke-controls">
            <div className="form-group">
              <label className="form-label">Stroke Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-picker"
                  value={text.strokeColor || '#000000'}
                  onChange={(e) => handleStrokeColorChange(e.target.value)}
                  disabled={disabled}
                />
                <input
                  type="text"
                  className="form-input color-text"
                  value={text.strokeColor || '#000000'}
                  onChange={(e) => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                      handleStrokeColorChange(e.target.value)
                    }
                  }}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Stroke Width</label>
              <div className="size-input-wrapper">
                <input
                  type="number"
                  className="form-input size-input"
                  value={text.strokeWidth || 2}
                  onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value) || 2)}
                  disabled={disabled}
                  min={0}
                  max={10}
                />
                <span className="unit">px</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="preview-section">
        <label className="section-label">Preview</label>
        <div className="text-preview">
          <span
            style={{
              fontFamily: text.font,
              fontSize: `${Math.min(text.fontSize, 48)}px`,
              color: text.fontColor,
              fontWeight: text.fontStyle?.includes('bold') ? 'bold' : 'normal',
              fontStyle: text.fontStyle?.includes('italic') ? 'italic' : 'normal',
              textShadow: showStroke
                ? `
                  -${text.strokeWidth || 2}px -${text.strokeWidth || 2}px 0 ${text.strokeColor || '#000'},
                  ${text.strokeWidth || 2}px -${text.strokeWidth || 2}px 0 ${text.strokeColor || '#000'},
                  -${text.strokeWidth || 2}px ${text.strokeWidth || 2}px 0 ${text.strokeColor || '#000'},
                  ${text.strokeWidth || 2}px ${text.strokeWidth || 2}px 0 ${text.strokeColor || '#000'}
                `
                : 'none',
            }}
          >
            {text.content || 'Sample Text'}
          </span>
        </div>
      </div>

      <style>{`
        .text-overlay-editor {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .input-mode-toggle {
          display: flex;
          gap: 0.25rem;
          padding: 0.25rem;
          background-color: var(--bg-secondary);
          border-radius: var(--radius-md);
        }

        .mode-btn {
          flex: 1;
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.15s;
        }

        .mode-btn:hover:not(:disabled) {
          color: var(--text-primary);
        }

        .mode-btn.active {
          background-color: var(--bg-primary);
          color: var(--primary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .mode-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .section-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .form-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .form-row {
          display: flex;
          gap: 0.75rem;
        }

        .form-row .form-group {
          flex: 1;
        }

        .form-input,
        .form-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background-color: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: var(--primary);
        }

        .form-input:disabled,
        .form-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .size-group {
          max-width: 100px;
        }

        .size-input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .size-input {
          width: 60px;
          text-align: center;
        }

        .unit {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .color-input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .color-picker {
          width: 32px;
          height: 32px;
          padding: 0;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
        }

        .color-text {
          flex: 1;
          font-family: var(--font-mono);
          font-size: 0.75rem;
        }

        .variable-selector {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .variable-preview {
          padding: 0.5rem 0.75rem;
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 0.875rem;
        }

        .variable-preview code {
          color: var(--primary);
        }

        .variable-categories {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .variable-category {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .category-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: none;
          background-color: var(--bg-secondary);
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .category-header:hover:not(:disabled) {
          background-color: var(--bg-tertiary);
        }

        .category-count {
          margin-left: auto;
          padding: 0.125rem 0.375rem;
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          font-size: 0.625rem;
        }

        .variable-list {
          display: flex;
          flex-direction: column;
        }

        .variable-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          border: none;
          border-top: 1px solid var(--border-color);
          background-color: var(--bg-primary);
          cursor: pointer;
          text-align: left;
        }

        .variable-item:hover:not(:disabled) {
          background-color: var(--bg-secondary);
        }

        .variable-item.selected {
          background-color: var(--primary-light, rgba(99, 102, 241, 0.1));
        }

        .variable-name {
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .variable-code {
          font-size: 0.75rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .section-header {
          display: flex;
          align-items: center;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
        }

        .toggle-label input {
          width: 16px;
          height: 16px;
        }

        .stroke-controls {
          margin-top: 0.5rem;
          padding-left: 1.5rem;
        }

        .preview-section {
          margin-top: 0.5rem;
        }

        .text-preview {
          padding: 1rem;
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-md);
          text-align: center;
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

export default TextOverlayEditor
