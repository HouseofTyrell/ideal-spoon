import { useCallback, useState } from 'react'
import PositionPicker from './PositionPicker'
import TextOverlayEditor from './TextOverlayEditor'
import { OverlayConfig, OverlayPosition, OverlayBackdrop, OverlayText } from '../../types/overlayConfig'
import './OverlayPropertiesPanel.css'

interface OverlayPropertiesPanelProps {
  overlay: OverlayConfig | null
  overlays?: OverlayConfig[]  // All overlays for suppress selector
  availableQueues?: string[]  // Available queue names
  onChange: (overlay: OverlayConfig) => void
  onDelete: (id: string) => void
  disabled?: boolean
}

function OverlayPropertiesPanel({
  overlay,
  overlays = [],
  availableQueues = [],
  onChange,
  onDelete,
  disabled = false,
}: OverlayPropertiesPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSuppressSelector, setShowSuppressSelector] = useState(false)

  const handlePositionChange = useCallback(
    (position: OverlayPosition) => {
      if (!overlay) return
      onChange({ ...overlay, position })
    },
    [overlay, onChange]
  )

  const handleBackdropChange = useCallback(
    (updates: Partial<OverlayBackdrop>) => {
      if (!overlay) return
      onChange({
        ...overlay,
        backdrop: { ...overlay.backdrop, ...updates },
      })
    },
    [overlay, onChange]
  )

  const handleGroupingChange = useCallback(
    (field: string, value: string | number | string[]) => {
      if (!overlay) return
      onChange({
        ...overlay,
        grouping: { ...overlay.grouping, [field]: value },
      })
    },
    [overlay, onChange]
  )

  // Toggle suppress overlay
  const handleToggleSuppressOverlay = useCallback(
    (overlayName: string) => {
      if (!overlay) return
      const currentSuppressed = overlay.grouping.suppressOverlays || []
      const newSuppressed = currentSuppressed.includes(overlayName)
        ? currentSuppressed.filter((n) => n !== overlayName)
        : [...currentSuppressed, overlayName]
      handleGroupingChange('suppressOverlays', newSuppressed)
    },
    [overlay, handleGroupingChange]
  )

  // Get other overlays for suppress selector (exclude current overlay)
  const otherOverlays = overlays.filter((o) => o.id !== overlay?.id)

  const handleTextChange = useCallback(
    (text: OverlayText) => {
      if (!overlay) return
      onChange({
        ...overlay,
        text,
        displayName: text.content || 'Text Overlay',
        name: `text_${text.content.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}`,
      })
    },
    [overlay, onChange]
  )

  // Parse hex color to get RGB and alpha separately
  const parseColor = (hex: string): { rgb: string; alpha: number } => {
    // Handle #RRGGBBAA format
    if (hex.length === 9) {
      const rgb = hex.slice(0, 7)
      const alpha = parseInt(hex.slice(7, 9), 16) / 255
      return { rgb, alpha: Math.round(alpha * 100) }
    }
    return { rgb: hex, alpha: 100 }
  }

  // Combine RGB and alpha into #RRGGBBAA
  const combineColor = (rgb: string, alphaPercent: number): string => {
    const alpha = Math.round((alphaPercent / 100) * 255)
      .toString(16)
      .padStart(2, '0')
    return `${rgb}${alpha}`
  }

  if (!overlay) {
    return (
      <div className="properties-panel empty">
        <div className="empty-state">
          <span className="empty-icon">🎨</span>
          <p>Select an overlay to edit its properties</p>
        </div>
      </div>
    )
  }

  const { rgb, alpha } = parseColor(overlay.backdrop.color)

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <span className="panel-icon">⚙️</span>
          <h3 className="panel-title">{overlay.displayName}</h3>
        </div>
        <button
          type="button"
          className="delete-btn"
          onClick={() => onDelete(overlay.id)}
          disabled={disabled}
          title="Remove overlay"
        >
          🗑️
        </button>
      </div>

      <div className="panel-content">
        {/* Text Overlay Settings (only for text overlays) */}
        {overlay.sourceType === 'text' && overlay.text && (
          <section className="properties-section">
            <TextOverlayEditor
              text={overlay.text}
              onChange={handleTextChange}
              disabled={disabled}
            />
          </section>
        )}

        {/* Position Section */}
        <section className="properties-section">
          <PositionPicker
            position={overlay.position}
            onChange={handlePositionChange}
            disabled={disabled}
          />
        </section>

        {/* Backdrop Section */}
        <section className="properties-section">
          <div className="section-header">
            <label className="section-label">Backdrop</label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={overlay.backdrop.enabled}
                onChange={(e) => handleBackdropChange({ enabled: e.target.checked })}
                disabled={disabled}
              />
              <span>Enabled</span>
            </label>
          </div>

          {overlay.backdrop.enabled && (
            <div className="backdrop-controls">
              <div className="control-row">
                <label className="control-label">Color:</label>
                <div className="color-picker">
                  <input
                    type="color"
                    value={rgb}
                    onChange={(e) =>
                      handleBackdropChange({ color: combineColor(e.target.value, alpha) })
                    }
                    disabled={disabled}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={rgb}
                    onChange={(e) => {
                      const val = e.target.value
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        handleBackdropChange({ color: combineColor(val, alpha) })
                      }
                    }}
                    disabled={disabled}
                    className="color-text"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="control-row">
                <label className="control-label">Opacity:</label>
                <div className="slider-group">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={alpha}
                    onChange={(e) =>
                      handleBackdropChange({ color: combineColor(rgb, parseInt(e.target.value)) })
                    }
                    disabled={disabled}
                    className="slider"
                  />
                  <span className="slider-value">{alpha}%</span>
                </div>
              </div>

              <div className="control-row">
                <label className="control-label">Radius:</label>
                <div className="number-input-group">
                  <input
                    type="number"
                    value={overlay.backdrop.radius || 0}
                    onChange={(e) =>
                      handleBackdropChange({ radius: parseInt(e.target.value) || 0 })
                    }
                    disabled={disabled}
                    className="number-input"
                    min={0}
                    max={50}
                  />
                  <span className="input-unit">px</span>
                </div>
              </div>

              <div className="control-row">
                <label className="control-label">Padding:</label>
                <div className="number-input-group">
                  <input
                    type="number"
                    value={overlay.backdrop.padding || 0}
                    onChange={(e) =>
                      handleBackdropChange({ padding: parseInt(e.target.value) || 0 })
                    }
                    disabled={disabled}
                    className="number-input"
                    min={0}
                    max={50}
                  />
                  <span className="input-unit">px</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Advanced Section */}
        <section className="properties-section">
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            <span>Advanced Options</span>
          </button>

          {showAdvanced && (
            <div className="advanced-controls">
              <div className="control-row">
                <label className="control-label">Group:</label>
                <input
                  type="text"
                  value={overlay.grouping.group || ''}
                  onChange={(e) => handleGroupingChange('group', e.target.value)}
                  disabled={disabled}
                  className="text-input"
                  placeholder="e.g., resolution"
                />
              </div>

              <div className="control-row">
                <label className="control-label">Weight:</label>
                <div className="number-input-group">
                  <input
                    type="number"
                    value={overlay.grouping.weight}
                    onChange={(e) =>
                      handleGroupingChange('weight', parseInt(e.target.value) || 0)
                    }
                    disabled={disabled}
                    className="number-input"
                    min={0}
                    max={1000}
                  />
                </div>
              </div>

              <div className="control-row">
                <label className="control-label">Queue:</label>
                {availableQueues.length > 0 ? (
                  <select
                    value={overlay.grouping.queue || ''}
                    onChange={(e) => handleGroupingChange('queue', e.target.value)}
                    disabled={disabled}
                    className="queue-select"
                  >
                    <option value="">None</option>
                    {availableQueues.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={overlay.grouping.queue || ''}
                    onChange={(e) => handleGroupingChange('queue', e.target.value)}
                    disabled={disabled}
                    className="text-input"
                    placeholder="e.g., bottom"
                  />
                )}
              </div>

              {/* Suppress Overlays Selector */}
              <div className="suppress-section">
                <button
                  type="button"
                  className="suppress-toggle"
                  onClick={() => setShowSuppressSelector(!showSuppressSelector)}
                  disabled={disabled}
                >
                  <span>{showSuppressSelector ? '▼' : '▶'}</span>
                  <span>Suppress Overlays</span>
                  {(overlay.grouping.suppressOverlays?.length || 0) > 0 && (
                    <span className="suppress-count">
                      {overlay.grouping.suppressOverlays?.length}
                    </span>
                  )}
                </button>

                {showSuppressSelector && (
                  <div className="suppress-list">
                    {otherOverlays.length === 0 ? (
                      <div className="suppress-empty">No other overlays to suppress</div>
                    ) : (
                      otherOverlays.map((other) => (
                        <label key={other.id} className="suppress-item">
                          <input
                            type="checkbox"
                            checked={overlay.grouping.suppressOverlays?.includes(other.name) || false}
                            onChange={() => handleToggleSuppressOverlay(other.name)}
                            disabled={disabled}
                          />
                          <span>{other.displayName}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default OverlayPropertiesPanel
