/**
 * Test options for selective preview testing
 * Allows users to customize which targets, libraries, and overlays to test
 */

export interface MediaTypeFilters {
  movies: boolean;
  shows: boolean;
  seasons: boolean;
  episodes: boolean;
}

/**
 * Manual builder configuration for fast preview rendering.
 *
 * When enabled, bypasses Kometa's external builders (IMDb, TMDb, Trakt, etc.)
 * and directly applies selected overlays to preview targets using their
 * hardcoded metadata. This reduces preview time from 30-60+ seconds to ~2 seconds.
 *
 * Example: Instead of Kometa fetching IMDb's Top 250 list to determine which
 * movies qualify for the ribbon, the user can simply check "IMDb Top 250" and
 * the badge will be applied to all preview targets that have the metadata.
 */
export interface ManualBuilderConfig {
  /**
   * Enable manual builder mode (skips external API calls)
   */
  enabled: boolean;

  /**
   * Resolution overlay (4K, 1080p, 720p badges)
   */
  resolution?: boolean;

  /**
   * Audio codec overlay (Atmos, DTS-HD, TrueHD badges)
   */
  audioCodec?: boolean;

  /**
   * HDR/Dolby Vision badges
   */
  hdr?: boolean;

  /**
   * Ratings overlay (IMDb, TMDb, RT scores)
   */
  ratings?: boolean;

  /**
   * Streaming service logos (Netflix, Disney+, Max, etc.)
   */
  streaming?: boolean;

  /**
   * TV network logos (HBO, AMC, etc.) - TV shows only
   */
  network?: boolean;

  /**
   * Studio logos
   */
  studio?: boolean;

  /**
   * Status badges (Returning, Ended, Canceled) - TV shows only
   */
  status?: boolean;

  /**
   * Ribbon badges - awards and rankings
   */
  ribbon?: {
    imdbTop250?: boolean;
    imdbLowest?: boolean;
    rtCertifiedFresh?: boolean;
    // Add more ribbon types as needed
  };
}

export interface TestOptions {
  /**
   * IDs of specific targets to include (from PREVIEW_TARGETS)
   * Empty array means "all targets"
   */
  selectedTargets: string[];

  /**
   * Media type filters - which types of media to include
   */
  mediaTypes: MediaTypeFilters;

  /**
   * Library names to include (from config analysis)
   * Empty array means "all libraries"
   */
  selectedLibraries: string[];

  /**
   * Overlay file paths/identifiers to include
   * Empty array means "all overlays"
   */
  selectedOverlays: string[];

  /**
   * Manual builder configuration for fast preview mode.
   * When enabled, applies overlays directly without external API calls.
   */
  manualBuilderConfig?: ManualBuilderConfig;

  /**
   * Use full Kometa builder mode (slower but more accurate).
   * When true, runs Kometa's full overlay builder pipeline including
   * external API calls, library scanning, and multi-level overlays.
   * When false (default), uses fast instant compositor for preview targets only.
   */
  useFullKometaBuilder?: boolean;
}

/**
 * Custom target definition for user-specified media items
 * (Future feature - not implemented in Phase 1)
 */
export interface CustomTarget {
  type: 'movie' | 'show' | 'season' | 'episode';
  searchTitle: string;
  searchYear?: number;
  seasonIndex?: number;
  episodeIndex?: number;
}

/**
 * Default manual builder configuration - disabled with all overlays off
 */
export const DEFAULT_MANUAL_BUILDER_CONFIG: ManualBuilderConfig = {
  enabled: false,
  resolution: false,
  audioCodec: false,
  hdr: false,
  ratings: false,
  streaming: false,
  network: false,
  studio: false,
  status: false,
  ribbon: {
    imdbTop250: false,
    imdbLowest: false,
    rtCertifiedFresh: false,
  },
};

/**
 * Default test options - include everything
 */
export const DEFAULT_TEST_OPTIONS: TestOptions = {
  selectedTargets: [],
  mediaTypes: {
    movies: true,
    shows: true,
    seasons: true,
    episodes: true,
  },
  selectedLibraries: [],
  selectedOverlays: [],
  manualBuilderConfig: undefined,
};

/**
 * Map media type string to filter key
 */
export function getMediaTypeKey(type: string): keyof MediaTypeFilters | null {
  switch (type) {
    case 'movie':
      return 'movies';
    case 'show':
      return 'shows';
    case 'season':
      return 'seasons';
    case 'episode':
      return 'episodes';
    default:
      return null;
  }
}
