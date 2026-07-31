export const CURRENT_VERSION = 'v0.1.3-beta';
export const GITHUB_REPO = 'cantpauseitmum/kraken-gemini-trader';

export interface VersionStatus {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  checkedAt: string;
}

let cachedStatus: VersionStatus | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

export class VersionService {
  async checkVersion(): Promise<VersionStatus> {
    const now = Date.now();
    if (cachedStatus && now - lastCheckTime < CACHE_TTL_MS) {
      return cachedStatus;
    }

    try {
      // Query GitHub tags or releases API
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/tags`, {
        headers: { 'User-Agent': 'Kraken-Gemini-Trader-App' },
      });

      if (!res.ok) {
        throw new Error(`GitHub API returned status ${res.status}`);
      }

      const tags = await res.json();
      let latestTag = CURRENT_VERSION;

      if (Array.isArray(tags) && tags.length > 0) {
        latestTag = tags[0].name || CURRENT_VERSION;
      }

      const updateAvailable = this.isNewerVersion(latestTag, CURRENT_VERSION);

      cachedStatus = {
        currentVersion: CURRENT_VERSION,
        latestVersion: latestTag,
        updateAvailable,
        releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
        checkedAt: new Date().toISOString(),
      };
      lastCheckTime = now;
      return cachedStatus;
    } catch (err: any) {
      console.warn('Error checking version from GitHub:', err.message);
      return {
        currentVersion: CURRENT_VERSION,
        latestVersion: CURRENT_VERSION,
        updateAvailable: false,
        releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const cleanLatest = latest.replace(/^v/, '');
    const cleanCurrent = current.replace(/^v/, '');
    return cleanLatest !== cleanCurrent;
  }
}

export const versionService = new VersionService();
