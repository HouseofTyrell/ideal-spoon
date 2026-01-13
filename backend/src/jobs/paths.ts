import * as path from 'path';

/**
 * Get the base path for jobs directory
 */
export function getJobsBasePath(): string {
  return process.env.JOBS_PATH || path.resolve(__dirname, '../../../jobs');
}

/**
 * Get the fonts directory path
 */
export function getFontsPath(): string {
  return process.env.FONTS_PATH || path.resolve(__dirname, '../../../fonts');
}

/**
 * Get paths for a specific job
 */
export function getJobPaths(jobId: string): {
  jobDir: string;
  inputDir: string;
  outputDir: string;
  configDir: string;
  logsDir: string;
  metaFile: string;
} {
  const jobDir = path.join(getJobsBasePath(), jobId);
  return {
    jobDir,
    inputDir: path.join(jobDir, 'input'),
    outputDir: path.join(jobDir, 'output'),
    configDir: path.join(jobDir, 'config'),
    logsDir: path.join(jobDir, 'logs'),
    metaFile: path.join(jobDir, 'meta.json'),
  };
}

/**
 * Get the Kometa renderer Docker image name
 */
export function getKometaRendererImage(): string {
  return process.env.KOMETA_RENDERER_IMAGE || 'kometa-preview-renderer:latest';
}

/**
 * Get the Kometa image tag
 */
export function getKometaImageTag(): string {
  return process.env.KOMETA_IMAGE_TAG || 'v2.0.2';
}

/**
 * Get optional user paths
 */
export function getUserPaths(): {
  userAssetsPath: string | undefined;
  userKometaConfigPath: string | undefined;
} {
  return {
    userAssetsPath: process.env.USER_ASSETS_PATH,
    userKometaConfigPath: process.env.USER_KOMETA_CONFIG_PATH,
  };
}
