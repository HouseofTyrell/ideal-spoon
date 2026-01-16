#!/usr/bin/env npx ts-node
/**
 * Fetch and cache community configs from the Kometa-Team/Community-Configs repo
 *
 * This script pre-fetches all community contributor configs to avoid GitHub API
 * rate limiting when users browse the community browser in the UI.
 *
 * Usage: npx ts-node scripts/fetch-community-configs.ts
 *
 * Output: backend/src/data/communityConfigs.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
  size: number;
}

interface CommunityContributor {
  username: string;
  configs: CommunityConfig[];
}

interface CommunityConfig {
  name: string;
  path: string;
  size: number;
  content: string;
  overlays: string[];
  url: string;
}

interface CommunityData {
  fetchedAt: string;
  version: string;
  contributors: CommunityContributor[];
}

const GITHUB_API_BASE = 'https://api.github.com/repos/Kometa-Team/Community-Configs/contents';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Kometa-Team/Community-Configs/master';
const GITHUB_BLOB_BASE = 'https://github.com/Kometa-Team/Community-Configs/blob/master';

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, headers: Record<string, string>, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers });

      // Check rate limit
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining && parseInt(remaining) < 10) {
        console.log(`  Rate limit low (${remaining} remaining), waiting...`);
        await delay(5000);
      }

      if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000;
          console.log(`  Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s...`);
          await delay(Math.max(waitTime, 60000));
          continue;
        }
      }

      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  Retry ${i + 1}/${retries} after error: ${err}`);
      await delay(2000 * (i + 1));
    }
  }
  throw new Error('Max retries exceeded');
}

function extractOverlays(content: string): string[] {
  try {
    const parsed = yaml.parse(content);
    const overlays: string[] = [];

    if (parsed?.libraries) {
      for (const libConfig of Object.values(parsed.libraries as Record<string, any>)) {
        const typedConfig = libConfig as Record<string, any>;
        if (typedConfig?.overlay_files && Array.isArray(typedConfig.overlay_files)) {
          for (const overlay of typedConfig.overlay_files) {
            if (typeof overlay === 'string') {
              overlays.push(overlay);
            } else if (typeof overlay === 'object') {
              // Handle object format like { pmm: 'resolution' }
              overlays.push(JSON.stringify(overlay));
            }
          }
        }
      }
    }

    return [...new Set(overlays)]; // Remove duplicates
  } catch {
    return [];
  }
}

async function main() {
  console.log('Fetching community configs from Kometa-Team/Community-Configs...\n');

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Kometa-Preview-Studio-Fetcher'
  };

  // Use GitHub token if available
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    console.log('Using GitHub token for authentication (higher rate limit)\n');
  } else {
    console.log('Warning: No GITHUB_TOKEN set. Rate limit is 60 requests/hour.');
    console.log('Set GITHUB_TOKEN env var for 5000 requests/hour.\n');
  }

  // Step 1: Fetch all contributors (directories)
  console.log('Step 1: Fetching contributor list...');
  const contributorsResponse = await fetchWithRetry(GITHUB_API_BASE + '/', headers);

  if (!contributorsResponse.ok) {
    throw new Error(`Failed to fetch contributors: ${contributorsResponse.statusText}`);
  }

  const contents = await contributorsResponse.json() as GitHubContent[];
  const contributorDirs = contents.filter(item => item.type === 'dir');

  console.log(`  Found ${contributorDirs.length} potential contributors\n`);

  // Step 2: Fetch configs for each contributor
  const communityData: CommunityData = {
    fetchedAt: new Date().toISOString(),
    version: '1.0',
    contributors: []
  };

  let processedCount = 0;
  let skippedCount = 0;

  for (const dir of contributorDirs) {
    processedCount++;
    process.stdout.write(`Step 2: Processing ${dir.name} (${processedCount}/${contributorDirs.length})...`);

    try {
      // Fetch contributor's files
      await delay(100); // Small delay to be nice to GitHub
      const filesResponse = await fetchWithRetry(`${GITHUB_API_BASE}/${dir.name}`, headers);

      if (!filesResponse.ok) {
        console.log(' skipped (fetch error)');
        skippedCount++;
        continue;
      }

      const files = await filesResponse.json() as GitHubContent[];
      const yamlFiles = files.filter(f =>
        f.type === 'file' && (f.name.endsWith('.yml') || f.name.endsWith('.yaml'))
      );

      if (yamlFiles.length === 0) {
        console.log(' skipped (no YAML files)');
        skippedCount++;
        continue;
      }

      // Fetch content for each YAML file
      const configs: CommunityConfig[] = [];

      for (const file of yamlFiles) {
        try {
          await delay(50);
          const contentResponse = await fetchWithRetry(
            `${GITHUB_RAW_BASE}/${dir.name}/${file.name}`,
            { 'User-Agent': 'Kometa-Preview-Studio-Fetcher' }
          );

          if (!contentResponse.ok) continue;

          const content = await contentResponse.text();
          const overlays = extractOverlays(content);

          // Only include configs that have overlays
          if (overlays.length > 0) {
            configs.push({
              name: file.name,
              path: file.path,
              size: file.size,
              content,
              overlays,
              url: `${GITHUB_BLOB_BASE}/${dir.name}/${file.name}`
            });
          }
        } catch (err) {
          // Skip individual file errors
        }
      }

      if (configs.length > 0) {
        communityData.contributors.push({
          username: dir.name,
          configs
        });
        console.log(` ${configs.length} config(s) with overlays`);
      } else {
        console.log(' skipped (no configs with overlays)');
        skippedCount++;
      }

    } catch (err) {
      console.log(` error: ${err}`);
      skippedCount++;
    }
  }

  // Step 3: Write output
  console.log('\nStep 3: Writing output...');

  const outputDir = path.join(__dirname, '..', 'backend', 'src', 'data');
  const outputPath = path.join(outputDir, 'communityConfigs.json');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(communityData, null, 2));

  // Calculate stats
  const totalConfigs = communityData.contributors.reduce((sum, c) => sum + c.configs.length, 0);
  const fileSize = fs.statSync(outputPath).size;

  console.log(`\n========================================`);
  console.log(`  Community Configs Fetch Complete!`);
  console.log(`========================================`);
  console.log(`  Contributors with overlays: ${communityData.contributors.length}`);
  console.log(`  Total configs: ${totalConfigs}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log(`  Output: ${outputPath}`);
  console.log(`  File size: ${(fileSize / 1024).toFixed(1)} KB`);
  console.log(`========================================\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
