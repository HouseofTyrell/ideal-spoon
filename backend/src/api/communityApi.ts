import { Router, Request, Response } from 'express';
import { communityLogger } from '../util/logger.js';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Types for the pre-fetched community data
interface CommunityConfig {
  name: string;
  path: string;
  size: number;
  content: string;
  overlays: string[];
  url: string;
}

interface CommunityContributor {
  username: string;
  configs: CommunityConfig[];
}

interface CommunityData {
  fetchedAt: string;
  version: string;
  contributors: CommunityContributor[];
}

// Load the pre-fetched community data
let communityData: CommunityData | null = null;

function loadCommunityData(): CommunityData | null {
  if (communityData) {
    return communityData;
  }

  try {
    // Try multiple possible paths for the data file
    // Use process.cwd() based paths since we can't use __dirname in CommonJS output
    const possiblePaths = [
      path.join(process.cwd(), 'dist/data/communityConfigs.json'),
      path.join(process.cwd(), 'src/data/communityConfigs.json'),
      path.join(process.cwd(), 'data/communityConfigs.json'),
      '/app/dist/data/communityConfigs.json',
      '/app/src/data/communityConfigs.json',
    ];

    for (const dataPath of possiblePaths) {
      if (fs.existsSync(dataPath)) {
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        communityData = JSON.parse(rawData) as CommunityData;
        communityLogger.info({
          path: dataPath,
          contributors: communityData.contributors.length,
          fetchedAt: communityData.fetchedAt
        }, 'Loaded pre-fetched community configs');
        return communityData;
      }
    }

    communityLogger.warn('Community configs data file not found');
    return null;
  } catch (err) {
    communityLogger.error({ err }, 'Failed to load community configs data');
    return null;
  }
}

/**
 * GET /api/community/contributors-with-overlays
 * List only contributors who have configs with overlays (from pre-fetched data)
 */
router.get('/contributors-with-overlays', async (req: Request, res: Response) => {
  try {
    const data = loadCommunityData();

    if (!data) {
      res.status(503).json({
        error: 'Community configs data not available',
        details: 'Pre-fetched data file not found. Run scripts/fetch-community-configs.sh to populate.'
      });
      return;
    }

    // Map to the expected format
    const contributors = data.contributors.map(c => ({
      username: c.username,
      path: c.username,
      configCount: c.configs.length
    }));

    communityLogger.debug({ count: contributors.length }, 'Returning pre-fetched contributors');

    res.json({
      contributors,
      total: contributors.length,
      cached: true,
      fetchedAt: data.fetchedAt
    });

  } catch (err) {
    communityLogger.error({ err }, 'Fetch contributors with overlays error');
    res.status(500).json({
      error: 'Failed to fetch contributors with overlays',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/community/contributors
 * List all contributors from pre-fetched data
 */
router.get('/contributors', async (req: Request, res: Response) => {
  try {
    const data = loadCommunityData();

    if (!data) {
      res.status(503).json({
        error: 'Community configs data not available',
        details: 'Pre-fetched data file not found. Run scripts/fetch-community-configs.sh to populate.'
      });
      return;
    }

    const contributors = data.contributors.map(c => ({
      username: c.username,
      path: c.username,
      configCount: c.configs.length
    }));

    res.json({
      contributors,
      total: contributors.length
    });

  } catch (err) {
    communityLogger.error({ err }, 'Fetch contributors error');
    res.status(500).json({
      error: 'Failed to fetch community contributors',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/community/contributor/:username
 * Get configs from a specific contributor (from pre-fetched data)
 */
router.get('/contributor/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const data = loadCommunityData();

    if (!data) {
      res.status(503).json({
        error: 'Community configs data not available',
        details: 'Pre-fetched data file not found. Run scripts/fetch-community-configs.sh to populate.'
      });
      return;
    }

    const contributor = data.contributors.find(c => c.username === username);

    if (!contributor) {
      res.status(404).json({ error: 'Contributor not found' });
      return;
    }

    // Map configs to the expected format (without content to save bandwidth)
    const configs = contributor.configs.map(c => ({
      name: c.name,
      path: c.path,
      size: c.size
    }));

    res.json({
      username,
      configs,
      total: configs.length
    });

  } catch (err) {
    communityLogger.error({ err }, 'Fetch contributor configs error');
    res.status(500).json({
      error: 'Failed to fetch contributor configs',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/community/config/:username/:filename
 * Get config file content (from pre-fetched data)
 */
router.get('/config/:username/:filename', async (req: Request, res: Response) => {
  try {
    const { username, filename } = req.params;
    const data = loadCommunityData();

    if (!data) {
      res.status(503).json({
        error: 'Community configs data not available',
        details: 'Pre-fetched data file not found. Run scripts/fetch-community-configs.sh to populate.'
      });
      return;
    }

    const contributor = data.contributors.find(c => c.username === username);

    if (!contributor) {
      res.status(404).json({ error: 'Contributor not found' });
      return;
    }

    const config = contributor.configs.find(c => c.name === filename);

    if (!config) {
      res.status(404).json({ error: 'Config file not found' });
      return;
    }

    res.json({
      username,
      filename,
      content: config.content,
      url: config.url,
      overlays: config.overlays
    });

  } catch (err) {
    communityLogger.error({ err }, 'Fetch config content error');
    res.status(500).json({
      error: 'Failed to fetch config content',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/community/parse-overlays
 * Parse overlay configurations from YAML content
 */
router.post('/parse-overlays', async (req: Request, res: Response) => {
  try {
    const { yamlContent } = req.body;

    if (!yamlContent || typeof yamlContent !== 'string') {
      res.status(400).json({ error: 'yamlContent is required' });
      return;
    }

    // Import yaml parser
    const yaml = await import('../util/yaml.js');
    const { parsed, error } = yaml.parseYaml(yamlContent);

    if (error || !parsed) {
      res.status(400).json({ error: 'Failed to parse YAML', details: error });
      return;
    }

    // Extract overlay information
    const config = parsed as Record<string, unknown>;
    const overlays: string[] = [];

    // Check for overlay_files in libraries
    if (config.libraries) {
      for (const [, libConfig] of Object.entries(config.libraries as Record<string, Record<string, unknown>>)) {
        if (libConfig.overlay_files && Array.isArray(libConfig.overlay_files)) {
          overlays.push(...libConfig.overlay_files.map((f: unknown) =>
            typeof f === 'string' ? f : JSON.stringify(f)
          ));
        }
      }
    }

    res.json({
      success: true,
      overlays: [...new Set(overlays)], // Remove duplicates
      libraryCount: config.libraries ? Object.keys(config.libraries as object).length : 0
    });

  } catch (err) {
    communityLogger.error({ err }, 'Parse overlays error');
    res.status(500).json({
      error: 'Failed to parse overlays',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/community/stats
 * Get statistics about the pre-fetched community data
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const data = loadCommunityData();

    if (!data) {
      res.status(503).json({
        error: 'Community configs data not available',
        details: 'Pre-fetched data file not found. Run scripts/fetch-community-configs.sh to populate.'
      });
      return;
    }

    const totalConfigs = data.contributors.reduce((sum, c) => sum + c.configs.length, 0);
    const totalOverlays = data.contributors.reduce((sum, c) =>
      sum + c.configs.reduce((cSum, cfg) => cSum + cfg.overlays.length, 0), 0
    );

    res.json({
      fetchedAt: data.fetchedAt,
      version: data.version,
      contributorCount: data.contributors.length,
      configCount: totalConfigs,
      overlayCount: totalOverlays
    });

  } catch (err) {
    communityLogger.error({ err }, 'Fetch stats error');
    res.status(500).json({
      error: 'Failed to fetch stats',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

export default router;
