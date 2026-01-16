#!/bin/bash
# Fetch and cache community configs from the Kometa-Team/Community-Configs repo
#
# This script pre-fetches all community contributor configs to avoid GitHub API
# rate limiting when users browse the community browser in the UI.
#
# Usage: ./scripts/fetch-community-configs.sh
#
# Output: backend/src/data/communityConfigs.json

set -e

# Change to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

echo "Fetching community configs from Kometa-Team/Community-Configs..."
echo ""

# Run inside the backend container to use Node.js
docker compose exec -T backend node -e "
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const GITHUB_API_BASE = 'https://api.github.com/repos/Kometa-Team/Community-Configs/contents';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Kometa-Team/Community-Configs/master';
const GITHUB_BLOB_BASE = 'https://github.com/Kometa-Team/Community-Configs/blob/master';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, headers, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers });
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining && parseInt(remaining) < 10) {
        console.log('  Rate limit low (' + remaining + ' remaining), waiting...');
        await delay(5000);
      }
      if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000;
          console.log('  Rate limited. Waiting ' + Math.ceil(waitTime / 1000) + 's...');
          await delay(Math.max(waitTime, 60000));
          continue;
        }
      }
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log('  Retry ' + (i + 1) + '/' + retries + ' after error');
      await delay(2000 * (i + 1));
    }
  }
  throw new Error('Max retries exceeded');
}

function extractOverlays(content) {
  try {
    const parsed = yaml.parse(content);
    const overlays = [];
    if (parsed && parsed.libraries) {
      for (const libConfig of Object.values(parsed.libraries)) {
        if (libConfig && libConfig.overlay_files && Array.isArray(libConfig.overlay_files)) {
          for (const overlay of libConfig.overlay_files) {
            if (typeof overlay === 'string') {
              overlays.push(overlay);
            } else if (typeof overlay === 'object') {
              overlays.push(JSON.stringify(overlay));
            }
          }
        }
      }
    }
    return [...new Set(overlays)];
  } catch {
    return [];
  }
}

async function main() {
  console.log('Step 1: Fetching contributor list...');

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Kometa-Preview-Studio-Fetcher'
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = 'token ' + process.env.GITHUB_TOKEN;
    console.log('Using GitHub token for authentication');
  }

  const contributorsResponse = await fetchWithRetry(GITHUB_API_BASE + '/', headers);
  if (!contributorsResponse.ok) {
    throw new Error('Failed to fetch contributors: ' + contributorsResponse.statusText);
  }

  const contents = await contributorsResponse.json();
  const contributorDirs = contents.filter(item => item.type === 'dir');
  console.log('  Found ' + contributorDirs.length + ' potential contributors');

  const communityData = {
    fetchedAt: new Date().toISOString(),
    version: '1.0',
    contributors: []
  };

  let processedCount = 0;
  let skippedCount = 0;

  for (const dir of contributorDirs) {
    processedCount++;
    process.stdout.write('Processing ' + dir.name + ' (' + processedCount + '/' + contributorDirs.length + ')...');

    try {
      await delay(100);
      const filesResponse = await fetchWithRetry(GITHUB_API_BASE + '/' + dir.name, headers);

      if (!filesResponse.ok) {
        console.log(' skipped (fetch error)');
        skippedCount++;
        continue;
      }

      const files = await filesResponse.json();
      const yamlFiles = files.filter(f =>
        f.type === 'file' && (f.name.endsWith('.yml') || f.name.endsWith('.yaml'))
      );

      if (yamlFiles.length === 0) {
        console.log(' skipped (no YAML files)');
        skippedCount++;
        continue;
      }

      const configs = [];

      for (const file of yamlFiles) {
        try {
          await delay(50);
          const contentResponse = await fetchWithRetry(
            GITHUB_RAW_BASE + '/' + dir.name + '/' + file.name,
            { 'User-Agent': 'Kometa-Preview-Studio-Fetcher' }
          );

          if (!contentResponse.ok) continue;

          const content = await contentResponse.text();
          const overlays = extractOverlays(content);

          if (overlays.length > 0) {
            configs.push({
              name: file.name,
              path: file.path,
              size: file.size,
              content,
              overlays,
              url: GITHUB_BLOB_BASE + '/' + dir.name + '/' + file.name
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
        console.log(' ' + configs.length + ' config(s) with overlays');
      } else {
        console.log(' skipped (no configs with overlays)');
        skippedCount++;
      }
    } catch (err) {
      console.log(' error');
      skippedCount++;
    }
  }

  // Write output
  const outputPath = '/app/dist/data/communityConfigs.json';
  const srcOutputPath = '/app/src/data/communityConfigs.json';

  // Ensure directories exist
  const distDir = path.dirname(outputPath);
  const srcDir = path.dirname(srcOutputPath);

  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

  const jsonOutput = JSON.stringify(communityData, null, 2);
  fs.writeFileSync(outputPath, jsonOutput);
  fs.writeFileSync(srcOutputPath, jsonOutput);

  const totalConfigs = communityData.contributors.reduce((sum, c) => sum + c.configs.length, 0);

  console.log('');
  console.log('========================================');
  console.log('  Community Configs Fetch Complete!');
  console.log('========================================');
  console.log('  Contributors with overlays: ' + communityData.contributors.length);
  console.log('  Total configs: ' + totalConfigs);
  console.log('  Skipped: ' + skippedCount);
  console.log('========================================');

  // Also output to stdout so we can capture it
  console.log('JSON_OUTPUT_START');
  console.log(jsonOutput);
  console.log('JSON_OUTPUT_END');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
"

# Copy the generated file from the container to the host
docker compose cp backend:/app/src/data/communityConfigs.json ./backend/src/data/communityConfigs.json 2>/dev/null || true

if [ -f "./backend/src/data/communityConfigs.json" ]; then
    echo ""
    echo "Output saved to: backend/src/data/communityConfigs.json"
    echo "File size: $(ls -lh ./backend/src/data/communityConfigs.json | awk '{print $5}')"
else
    echo ""
    echo "Warning: Could not copy output file from container"
fi
