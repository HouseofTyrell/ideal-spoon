interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  minZoom?: number
  maxZoom?: number
}

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  minZoom = 0.5,
  maxZoom = 4,
}: ZoomControlsProps) {
  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className="zoom-controls">
      <button
        className="zoom-btn"
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M8 11h6" />
        </svg>
      </button>

      <button
        className="zoom-percent"
        onClick={onZoomReset}
        title="Reset zoom"
        aria-label="Reset zoom to 100%"
      >
        {zoomPercent}%
      </button>

      <button
        className="zoom-btn"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      </button>

      <style>{`
        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 2px;
          background-color: var(--bg-primary);
          border-radius: var(--radius-sm);
          padding: 2px;
        }

        .zoom-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.2s;
        }

        .zoom-btn:hover:not(:disabled) {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .zoom-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .zoom-percent {
          min-width: 48px;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.2s;
        }

        .zoom-percent:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}

export default ZoomControls
