#!/usr/bin/env npx tsx
/**
 * Debug script to test Plex search functionality
 *
 * Usage: npx tsx src/debug/testPlexSearch.ts
 *
 * Set environment variables:
 *   PLEX_URL=http://10.0.0.22:32400
 *   PLEX_TOKEN=your_token_here
 */

import { PlexClient } from '../plex/plexClient.js';
import { PREVIEW_TARGETS } from '../plex/resolveTargets.js';

const PLEX_URL = process.env.PLEX_URL || 'http://10.0.0.22:32400';
const PLEX_TOKEN = process.env.PLEX_TOKEN || '';

async function main() {
  console.log('='.repeat(60));
  console.log('Plex Search Debug Tool');
  console.log('='.repeat(60));
  console.log();

  if (!PLEX_TOKEN) {
    console.error('ERROR: PLEX_TOKEN environment variable is required');
    console.error('Usage: PLEX_URL=http://... PLEX_TOKEN=... npx tsx src/debug/testPlexSearch.ts');
    process.exit(1);
  }

  console.log(`Plex URL: ${PLEX_URL}`);
  console.log(`Token: ${PLEX_TOKEN.substring(0, 4)}...${PLEX_TOKEN.substring(PLEX_TOKEN.length - 4)}`);
  console.log();

  const client = new PlexClient({
    url: PLEX_URL,
    token: PLEX_TOKEN,
    timeout: 120, // Increased timeout for large libraries
  });

  // Test 1: Connection
  console.log('='.repeat(60));
  console.log('TEST 1: Connection Test');
  console.log('='.repeat(60));
  try {
    const connected = await client.testConnection();
    if (connected) {
      console.log('✓ Connection successful');
    } else {
      console.error('✗ Connection FAILED: testConnection returned false');
      process.exit(1);
    }
  } catch (err) {
    console.error('✗ Connection FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
  console.log();

  // Test 2: Search each preview target
  console.log('='.repeat(60));
  console.log('TEST 2: Search Preview Targets');
  console.log('='.repeat(60));
  console.log();

  for (const target of PREVIEW_TARGETS) {
    console.log(`--- Target: ${target.id} (${target.type}) ---`);
    console.log(`    Search title: "${target.searchTitle}"`);
    if (target.searchYear) {
      console.log(`    Search year: ${target.searchYear}`);
    }
    if (target.seasonIndex) {
      console.log(`    Season index: ${target.seasonIndex}`);
    }
    if (target.episodeIndex) {
      console.log(`    Episode index: ${target.episodeIndex}`);
    }
    console.log();

    try {
      if (target.type === 'movie') {
        console.log(`    Calling searchMovies("${target.searchTitle}", ${target.searchYear})...`);
        const movies = await client.searchMovies(target.searchTitle, target.searchYear);
        console.log(`    Results: ${movies.length} movie(s) found`);

        if (movies.length === 0) {
          console.log('    ✗ NO MOVIES FOUND');
          // Try without year filter
          console.log(`    Trying without year filter...`);
          const moviesNoYear = await client.searchMovies(target.searchTitle);
          console.log(`    Results without year: ${moviesNoYear.length} movie(s) found`);
          for (const m of moviesNoYear.slice(0, 5)) {
            console.log(`      - "${m.title}" (${m.year}) [ratingKey: ${m.ratingKey}]`);
          }
        } else {
          console.log('    ✓ Movies found:');
          for (const m of movies) {
            console.log(`      - "${m.title}" (${m.year}) [ratingKey: ${m.ratingKey}]`);
          }
        }

      } else if (target.type === 'show') {
        console.log(`    Calling searchShows("${target.searchTitle}")...`);
        const shows = await client.searchShows(target.searchTitle);
        console.log(`    Results: ${shows.length} show(s) found`);

        if (shows.length === 0) {
          console.log('    ✗ NO SHOWS FOUND');
        } else {
          console.log('    ✓ Shows found:');
          for (const s of shows) {
            console.log(`      - "${s.title}" (${s.year || 'N/A'}) [ratingKey: ${s.ratingKey}]`);
          }
        }

      } else if (target.type === 'season') {
        console.log(`    Step 1: Searching for show "${target.searchTitle}"...`);
        const shows = await client.searchShows(target.searchTitle);

        if (shows.length === 0) {
          console.log('    ✗ Show not found - cannot get seasons');
        } else {
          const show = shows[0];
          console.log(`    ✓ Found show: "${show.title}" [ratingKey: ${show.ratingKey}]`);

          console.log(`    Step 2: Getting children (seasons) of show...`);
          const seasons = await client.getChildren(show.ratingKey);
          console.log(`    Results: ${seasons.length} season(s) found`);

          for (const s of seasons) {
            const match = s.index === target.seasonIndex ? ' ← TARGET' : '';
            console.log(`      - ${s.title} [index: ${s.index}, ratingKey: ${s.ratingKey}]${match}`);
          }

          const targetSeason = seasons.find(s => s.index === target.seasonIndex);
          if (!targetSeason) {
            console.log(`    ✗ Season ${target.seasonIndex} NOT FOUND`);
          } else {
            console.log(`    ✓ Target season found: ${targetSeason.title} [ratingKey: ${targetSeason.ratingKey}]`);
          }
        }

      } else if (target.type === 'episode') {
        console.log(`    Step 1: Searching for show "${target.searchTitle}"...`);
        const shows = await client.searchShows(target.searchTitle);

        if (shows.length === 0) {
          console.log('    ✗ Show not found - cannot get episodes');
        } else {
          const show = shows[0];
          console.log(`    ✓ Found show: "${show.title}" [ratingKey: ${show.ratingKey}]`);

          console.log(`    Step 2: Getting seasons...`);
          const seasons = await client.getChildren(show.ratingKey);
          const targetSeason = seasons.find(s => s.index === target.seasonIndex);

          if (!targetSeason) {
            console.log(`    ✗ Season ${target.seasonIndex} NOT FOUND`);
          } else {
            console.log(`    ✓ Found season: ${targetSeason.title} [ratingKey: ${targetSeason.ratingKey}]`);

            console.log(`    Step 3: Getting episodes...`);
            const episodes = await client.getChildren(targetSeason.ratingKey);
            console.log(`    Results: ${episodes.length} episode(s) found`);

            for (const e of episodes.slice(0, 10)) {
              const match = e.index === target.episodeIndex ? ' ← TARGET' : '';
              console.log(`      - E${e.index}: "${e.title}" [ratingKey: ${e.ratingKey}]${match}`);
            }
            if (episodes.length > 10) {
              console.log(`      ... and ${episodes.length - 10} more episodes`);
            }

            const targetEpisode = episodes.find(e => e.index === target.episodeIndex);
            if (!targetEpisode) {
              console.log(`    ✗ Episode ${target.episodeIndex} NOT FOUND`);
            } else {
              console.log(`    ✓ Target episode found: "${targetEpisode.title}" [ratingKey: ${targetEpisode.ratingKey}]`);
            }
          }
        }
      }

    } catch (err) {
      console.error(`    ✗ ERROR: ${err instanceof Error ? err.message : err}`);
      if (err instanceof Error && err.stack) {
        console.error(`    Stack: ${err.stack.split('\n').slice(1, 3).join('\n    ')}`);
      }
    }

    console.log();
  }

  // Test 3: Raw library sections
  console.log('='.repeat(60));
  console.log('TEST 3: Library Sections');
  console.log('='.repeat(60));
  try {
    const response = await fetch(`${PLEX_URL}/library/sections?X-Plex-Token=${PLEX_TOKEN}`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await response.json() as { MediaContainer?: { Directory?: Array<{ key: string; title: string; type: string }> } };
    const sections = data.MediaContainer?.Directory || [];

    console.log(`Found ${sections.length} library section(s):`);
    for (const section of sections) {
      console.log(`  - [${section.key}] "${section.title}" (${section.type})`);
    }
  } catch (err) {
    console.error('Error fetching library sections:', err instanceof Error ? err.message : err);
  }
  console.log();

  console.log('='.repeat(60));
  console.log('Debug complete');
  console.log('='.repeat(60));
}

main().catch(console.error);
