/**
 * Preview targets for testing overlays
 * Single source of truth for frontend components
 */

export type MediaType = 'movie' | 'show' | 'season' | 'episode';

export interface PreviewTarget {
  id: string;
  label: string;
  type: MediaType;
  displayType: string; // Human-readable type for UI display
}

/**
 * Static preview targets
 * These mirror the backend PREVIEW_TARGETS in resolveTargets.ts
 */
export const PREVIEW_TARGETS: PreviewTarget[] = [
  {
    id: 'matrix',
    label: 'The Matrix (1999)',
    type: 'movie',
    displayType: 'Movie'
  },
  {
    id: 'dune',
    label: 'Dune (2021)',
    type: 'movie',
    displayType: 'Movie'
  },
  {
    id: 'breakingbad_series',
    label: 'Breaking Bad',
    type: 'show',
    displayType: 'Series'
  },
  {
    id: 'breakingbad_s01',
    label: 'Breaking Bad',
    type: 'season',
    displayType: 'Season 1'
  },
  {
    id: 'breakingbad_s01e01',
    label: 'Breaking Bad',
    type: 'episode',
    displayType: 'S01E01'
  },
];

/**
 * Get targets filtered by media type flags
 */
export function filterTargetsByMediaType(
  targets: PreviewTarget[],
  mediaTypes: { movies: boolean; shows: boolean; seasons: boolean; episodes: boolean }
): PreviewTarget[] {
  return targets.filter((t) => {
    switch (t.type) {
      case 'movie':
        return mediaTypes.movies;
      case 'show':
        return mediaTypes.shows;
      case 'season':
        return mediaTypes.seasons;
      case 'episode':
        return mediaTypes.episodes;
      default:
        return true;
    }
  });
}
