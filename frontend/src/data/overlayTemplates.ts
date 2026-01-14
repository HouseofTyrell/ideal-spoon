import {
  OverlayConfig,
  QueueConfig,
  createOverlayConfig,
  BUILTIN_OVERLAYS,
} from '../types/overlayConfig'

export interface OverlayTemplate {
  id: string
  name: string
  description: string
  icon: string
  overlays: () => OverlayConfig[]
  queues?: () => QueueConfig[]
}

// Helper to find builtin overlay by ID
const findBuiltin = (id: string) => {
  return BUILTIN_OVERLAYS.find((b) => b.id === id) || null
}

// Helper to create overlays from builtin IDs
const createOverlays = (ids: string[]): OverlayConfig[] => {
  return ids
    .map((id) => {
      const builtin = findBuiltin(id)
      return builtin ? createOverlayConfig(builtin) : null
    })
    .filter((o): o is OverlayConfig => o !== null)
}

export const OVERLAY_TEMPLATES: OverlayTemplate[] = [
  {
    id: 'resolution-basic',
    name: 'Resolution Badges',
    description: 'Show 4K, 1080p, and other resolution indicators',
    icon: '📺',
    overlays: () => createOverlays(['resolution']),
  },
  {
    id: 'quality-pack',
    name: 'Quality Pack',
    description: 'Resolution and audio codec indicators for quality-focused libraries',
    icon: '🎬',
    overlays: () => createOverlays(['resolution', 'audio_codec']),
  },
  {
    id: 'streaming-services',
    name: 'Streaming Services',
    description: 'Show which streaming platform has the content',
    icon: '📡',
    overlays: () => createOverlays(['streaming']),
  },
  {
    id: 'movie-complete',
    name: 'Movie Complete',
    description: 'Full overlay setup for movie libraries: resolution, audio, ratings, and streaming',
    icon: '🎥',
    overlays: () =>
      createOverlays(['resolution', 'audio_codec', 'ratings', 'streaming']),
  },
  {
    id: 'tv-complete',
    name: 'TV Shows Complete',
    description: 'Full overlay setup for TV libraries: resolution, network, and status',
    icon: '📺',
    overlays: () => createOverlays(['resolution', 'network', 'status']),
  },
  {
    id: 'awards-ribbons',
    name: 'Awards & Ribbons',
    description: 'Highlight award-winning and top-rated content',
    icon: '🏆',
    overlays: () => createOverlays(['ribbon', 'ratings']),
  },
  {
    id: 'studio-network',
    name: 'Studio & Network',
    description: 'Display production studio and TV network logos',
    icon: '🏢',
    overlays: () => createOverlays(['studio', 'network']),
  },
]
