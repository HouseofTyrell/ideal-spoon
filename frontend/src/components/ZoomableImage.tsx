import { useState, useRef, useCallback, useEffect } from 'react'

interface ZoomableImageProps {
  children: React.ReactNode
  zoom: number
  onZoomChange: (zoom: number) => void
  minZoom?: number
  maxZoom?: number
}

function ZoomableImage({
  children,
  zoom,
  onZoomChange,
  minZoom = 0.5,
  maxZoom = 4,
}: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  // Reset position when zoom resets to 1
  useEffect(() => {
    if (zoom === 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [zoom])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.min(maxZoom, Math.max(minZoom, zoom + delta))
      onZoomChange(newZoom)
    },
    [zoom, minZoom, maxZoom, onZoomChange]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsPanning(true)
        setStartPos({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        })
      }
    },
    [zoom, position]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPosition({
          x: e.clientX - startPos.x,
          y: e.clientY - startPos.y,
        })
      }
    },
    [isPanning, startPos]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false)
  }, [])

  return (
    <div
      ref={containerRef}
      className="zoomable-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="zoomable-content"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
        }}
      >
        {children}
      </div>

      <style>{`
        .zoomable-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        .zoomable-content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transform-origin: center center;
          transition: transform 0.1s ease-out;
        }

        .zoomable-container:active .zoomable-content {
          transition: none;
        }
      `}</style>
    </div>
  )
}

export default ZoomableImage
