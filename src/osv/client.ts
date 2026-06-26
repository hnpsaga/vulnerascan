import {
  PackageCoordinate,
  RichVulnerabilityRecord,
} from "../vulnerability/vulnerability-models.js";

import { VulnerabilityCache } from "../provider/interfaces/vulnerability-cache.js";
import { OsvBatchQueryResponse, OsvVulnerability } from "./models.js";
import { mapToOsvEcosystem, mapOsvVulnerability, mergeVulnerabilityRecords } from "./mapper.js";
import { OsvApiError } from "./errors.js";

export interface OsvScanResult {
  provider: string;
  vulnerabilities: RichVulnerabilityRecord[];
  metadata?: {
    timestamp: string;
    totalPackages: number;
    cacheHits: number;
    networkQueries: number;
  };
}

// ---------------------------------------------------------------------------
// HTTP helpers (private to this module)
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = 10000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeoutMs?: number; maxRetries?: number },
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  let attempt = 0;
  let delay = 200;

  while (true) {
    try {
      const res = await fetchWithTimeout(url, options);
      if (res.status >= 500 && attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

async function limitConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// OsvClient
// ---------------------------------------------------------------------------

export class OsvClient {
  readonly name = "osv";
  private cache?: VulnerabilityCache;
  private apiUrl: string;
  private timeoutMs: number;

  constructor(options?: { cache?: VulnerabilityCache; apiUrl?: string; timeoutMs?: number }) {
    this.cache = options?.cache;
    this.apiUrl = options?.apiUrl || process.env.VULNERASCAN_OSV_API_URL || "https://api.osv.dev";
    this.timeoutMs = options?.timeoutMs || 10000;
  }

  private getCoordinateKey(coordinate: PackageCoordinate): string {
    return `${coordinate.ecosystem}:${coordinate.packageName}@${coordinate.version}`;
  }

  async queryPackages(packages: PackageCoordinate[]): Promise<OsvScanResult> {
    if (process.env.VULNERASCAN_TEST_MODE === "true") {
      return {
        provider: this.name,
        vulnerabilities: [],
        metadata: {
          timestamp: new Date().toISOString(),
          totalPackages: packages.length,
          cacheHits: 0,
          networkQueries: 0,
        },
      };
    }

    if (packages.length === 0) {
      return {
        provider: this.name,
        vulnerabilities: [],
        metadata: {
          timestamp: new Date().toISOString(),
          totalPackages: 0,
          cacheHits: 0,
          networkQueries: 0,
        },
      };
    }

    const vulnerabilitiesMap = new Map<string, RichVulnerabilityRecord[]>();
    const uncachedPackages: PackageCoordinate[] = [];
    let cacheHitsCount = 0;

    for (const pkg of packages) {
      const key = this.getCoordinateKey(pkg);
      if (this.cache) {
        const cached = await this.cache.get(pkg);
        if (cached !== null) {
          vulnerabilitiesMap.set(key, cached);
          cacheHitsCount++;
          continue;
        }
      }
      uncachedPackages.push(pkg);
    }

    if (uncachedPackages.length > 0) {
      const chunkSize = 100;
      const chunks: PackageCoordinate[][] = [];
      for (let i = 0; i < uncachedPackages.length; i += chunkSize) {
        chunks.push(uncachedPackages.slice(i, i + chunkSize));
      }

      const allUniqueVulnIds = new Set<string>();
      const packageToVulnIds = new Map<string, string[]>();

      for (const chunk of chunks) {
        const queries = chunk.map((pkg) => ({
          package: {
            name: pkg.packageName,
            ecosystem: mapToOsvEcosystem(pkg.ecosystem),
          },
          version: pkg.version,
        }));

        const response = await fetchWithRetry(`${this.apiUrl}/v1/querybatch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ queries }),
          timeoutMs: this.timeoutMs,
        });

        if (!response.ok) {
          throw new OsvApiError(response.status, response.statusText, "querybatch");
        }

        const body = (await response.json()) as OsvBatchQueryResponse;
        const results = body.results || [];

        for (let i = 0; i < chunk.length; i++) {
          const pkg = chunk[i];
          const pkgKey = this.getCoordinateKey(pkg);
          const result = results[i];
          const vulnIds = (result?.vulns || []).map((v) => v.id);

          packageToVulnIds.set(pkgKey, vulnIds);
          for (const id of vulnIds) {
            allUniqueVulnIds.add(id);
          }
        }
      }

      const hydratedVulns = new Map<string, OsvVulnerability>();
      const uniqueIdsArray = Array.from(allUniqueVulnIds);

      await limitConcurrency(uniqueIdsArray, 10, async (id) => {
        try {
          const res = await fetchWithRetry(`${this.apiUrl}/v1/vulns/${id}`, {
            method: "GET",
            timeoutMs: this.timeoutMs,
          });
          if (res.ok) {
            const osvData = (await res.json()) as OsvVulnerability;
            hydratedVulns.set(id, osvData);
          } else {
            console.warn(
              `Failed to fetch OSV vulnerability details for ${id} (status: ${res.status})`,
            );
          }
        } catch (err) {
          console.warn(`Error fetching OSV vulnerability details for ${id}:`, err);
        }
      });

      for (const pkg of uncachedPackages) {
        const pkgKey = this.getCoordinateKey(pkg);
        const vulnIds = packageToVulnIds.get(pkgKey) || [];
        const pkgVulns: RichVulnerabilityRecord[] = [];

        for (const id of vulnIds) {
          const osvData = hydratedVulns.get(id);
          if (osvData) {
            pkgVulns.push(mapOsvVulnerability(osvData, pkg));
          } else {
            pkgVulns.push({
              id,
              aliases: [],
              summary: `Failed to fetch details for vulnerability ${id}`,
              references: [],
              affectedPackages: [pkg],
            });
          }
        }

        vulnerabilitiesMap.set(pkgKey, pkgVulns);

        if (this.cache) {
          await this.cache.set(pkg, pkgVulns);
        }
      }
    }

    const allRecords: RichVulnerabilityRecord[] = [];
    for (const vulns of vulnerabilitiesMap.values()) {
      allRecords.push(...vulns);
    }

    const mergedVulnerabilities = mergeVulnerabilityRecords(allRecords);

    return {
      provider: this.name,
      vulnerabilities: mergedVulnerabilities,
      metadata: {
        timestamp: new Date().toISOString(),
        totalPackages: packages.length,
        cacheHits: cacheHitsCount,
        networkQueries: uncachedPackages.length,
      },
    };
  }
}
