import { PackageCoordinate, VulnerabilityRecord } from "../vulnerability/vulnerability-models.js";
import { FilesystemVulnerabilityCache } from "../provider/cache/filesystem-cache.js";
import { VulnerabilityCache } from "../provider/interfaces/vulnerability-cache.js";

/**
 * Re-exports the cache types for use within the OSV module.
 *
 * The underlying cache implementation is shared with the rest of the application.
 * This file exists as the single point of cache interaction for the OSV module,
 * keeping cache wiring concerns contained here.
 */
export type { VulnerabilityCache };
export { FilesystemVulnerabilityCache };

/**
 * Creates the default filesystem-backed vulnerability cache for OSV results.
 */
export function createOsvCache(cacheDir: string, ttlHours: number): VulnerabilityCache {
  return new FilesystemVulnerabilityCache(cacheDir, ttlHours);
}

export type { PackageCoordinate, VulnerabilityRecord };
