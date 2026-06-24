import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import http from "http";
import {
  validateConfig,
  loadConfig,
  DEFAULT_CONFIG,
  FilesystemVulnerabilityCache,
  OsvVulnerabilityProvider,
  ProviderRegistry,
  PackageCoordinate,
  VulnerabilityRecord,
} from "../src/index.js";

const TEST_DIR = join(import.meta.dirname, "tmp-provider-tests");

let mockServer: http.Server;
let mockServerUrl: string;
let mockResponseBehavior: {
  status?: number;
  queryBatchBody?: unknown;
  vulnBodies?: Record<string, unknown>;
  delayMs?: number;
  requestCount?: number;
  statusSequence?: number[];
} = {};

// Helper to start the mock HTTP server
beforeAll(async () => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });

  mockServer = http.createServer((req, res) => {
    const count = mockResponseBehavior.requestCount || 0;
    mockResponseBehavior.requestCount = count + 1;

    let body: unknown = {};
    let status = mockResponseBehavior.status || 200;

    if (mockResponseBehavior.statusSequence && count < mockResponseBehavior.statusSequence.length) {
      status = mockResponseBehavior.statusSequence[count];
    } else {
      status = mockResponseBehavior.status || 200;
    }

    if (req.method === "POST" && req.url === "/v1/querybatch") {
      body = mockResponseBehavior.queryBatchBody || {};
    } else if (req.method === "GET" && req.url && req.url.includes("/v1/vulns/")) {
      const parts = req.url.split("/");
      const id = parts[parts.length - 1];
      body = mockResponseBehavior.vulnBodies?.[id] || {};
    }

    const sendData = (): void => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        Connection: "close",
      });
      res.end(JSON.stringify(body || {}));
    };

    if (mockResponseBehavior.delayMs) {
      setTimeout(sendData, mockResponseBehavior.delayMs);
    } else {
      sendData();
    }
  });

  await new Promise<void>((resolve) => {
    mockServer.listen(0, "127.0.0.1", () => {
      const address = mockServer.address();
      if (address && typeof address === "object") {
        mockServerUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });
});

afterAll(() => {
  mockServer.close();
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

beforeEach(() => {
  mockResponseBehavior = {};
});

describe("Vulnerability Provider Configuration", () => {
  it("defines standard default configuration", () => {
    expect(DEFAULT_CONFIG.provider.active).toBe("osv");
    expect(DEFAULT_CONFIG.provider.osv?.cache.enabled).toBe(true);
    expect(DEFAULT_CONFIG.provider.osv?.cache.ttlHours).toBe(24);
  });

  it("loads defaults when configuration file does not exist", () => {
    const nonExistentPath = join(TEST_DIR, "non-existent-config.json");
    const loaded = loadConfig(nonExistentPath);
    expect(loaded.provider.active).toBe("osv");
    expect(loaded.provider.osv?.cache.enabled).toBe(true);
  });

  it("validates correct configurations successfully", () => {
    const valid = {
      provider: {
        active: "osv",
        osv: {
          cache: {
            enabled: false,
            ttlHours: 12,
          },
        },
      },
    };

    const validated = validateConfig(valid);
    expect(validated.provider.active).toBe("osv");
    expect(validated.provider.osv?.cache.enabled).toBe(false);
    expect(validated.provider.osv?.cache.ttlHours).toBe(12);
  });

  it("throws validation errors for invalid configurations", () => {
    expect(() => validateConfig(null)).toThrow("Configuration must be a valid JSON object");
    expect(() => validateConfig({})).toThrow("Missing 'provider' configuration section");
    expect(() => validateConfig({ provider: {} })).toThrow(
      "'provider.active' must be a non-empty string",
    );
    expect(() => validateConfig({ provider: { active: "github" } })).toThrow(
      "Unsupported provider",
    );
    expect(() =>
      validateConfig({
        provider: {
          active: "osv",
          osv: { cache: "not-an-object" },
        },
      }),
    ).toThrow("'provider.osv.cache' must be an object");
    expect(() =>
      validateConfig({
        provider: {
          active: "osv",
          osv: { cache: { enabled: "not-a-boolean" } },
        },
      }),
    ).toThrow("'provider.osv.cache.enabled' must be a boolean");
    expect(() =>
      validateConfig({
        provider: {
          active: "osv",
          osv: { cache: { ttlHours: -1 } },
        },
      }),
    ).toThrow("'provider.osv.cache.ttlHours' must be a non-negative number");
  });
});

describe("Vulnerability Provider Registry", () => {
  it("registers and resolves providers correctly", () => {
    const registry = new ProviderRegistry();
    const provider = new OsvVulnerabilityProvider();
    registry.register(provider);

    expect(registry.getRegisteredNames()).toContain("osv");
    expect(registry.resolve("osv")).toBe(provider);
    expect(registry.resolve("OSV")).toBe(provider); // Case insensitivity
  });

  it("throws when resolving unregistered providers", () => {
    const registry = new ProviderRegistry();
    expect(() => registry.resolve("nvd")).toThrow("is not registered");
  });
});

describe("Vulnerability Cache", () => {
  let cache: FilesystemVulnerabilityCache;
  const cacheDir = join(TEST_DIR, "vcache");

  beforeEach(() => {
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true });
    }
    mkdirSync(cacheDir, { recursive: true });
    cache = new FilesystemVulnerabilityCache(cacheDir, 2); // 2 hours TTL
  });

  it("returns null on cache miss", async () => {
    const coordinate: PackageCoordinate = {
      ecosystem: "npm",
      packageName: "lodash",
      version: "4.17.20",
    };
    const cached = await cache.get(coordinate);
    expect(cached).toBeNull();
  });

  it("stores and retrieves vulnerabilities (serialization and hit)", async () => {
    const coordinate: PackageCoordinate = {
      ecosystem: "npm",
      packageName: "lodash",
      version: "4.17.20",
    };

    const vulnerabilities: VulnerabilityRecord[] = [
      {
        id: "GHSA-1",
        aliases: ["CVE-1"],
        summary: "Summary 1",
        details: "Details 1",
        references: [{ source: "ADVISORY", identifier: "url1", url: "url1" }],
        affectedPackages: [coordinate],
      },
    ];

    await cache.set(coordinate, vulnerabilities);
    const cached = await cache.get(coordinate);

    expect(cached).not.toBeNull();
    expect(cached).toHaveLength(1);
    expect(cached![0].id).toBe("GHSA-1");
    expect(cached![0].summary).toBe("Summary 1");
    expect(cached![0].affectedPackages[0].packageName).toBe("lodash");
  });

  it("respects expiration / TTL", async () => {
    const coordinate: PackageCoordinate = {
      ecosystem: "npm",
      packageName: "lodash",
      version: "4.17.20",
    };

    // Short-lived cache: 0 hours TTL (immediate expiration)
    const shortCache = new FilesystemVulnerabilityCache(cacheDir, 0);

    const vulnerabilities: VulnerabilityRecord[] = [
      {
        id: "GHSA-1",
        aliases: [],
        summary: "Summary 1",
        references: [],
        affectedPackages: [coordinate],
      },
    ];

    await shortCache.set(coordinate, vulnerabilities);
    const cached = await shortCache.get(coordinate);
    expect(cached).toBeNull(); // Expired immediately
  });
});

describe.sequential("OSV Vulnerability Provider", () => {
  it("handles successful empty responses", async () => {
    const provider = new OsvVulnerabilityProvider({ apiUrl: mockServerUrl });
    mockResponseBehavior.status = 200;
    mockResponseBehavior.queryBatchBody = {
      results: [{ vulns: [] }],
    };

    const coordinates: PackageCoordinate[] = [
      { ecosystem: "npm", packageName: "safe-pkg", version: "1.0.0" },
    ];

    const response = await provider.queryPackages(coordinates);
    expect(response.provider).toBe("osv");
    expect(response.vulnerabilities).toHaveLength(0);
    expect(response.metadata?.totalPackages).toBe(1);
    expect(response.metadata?.networkQueries).toBe(1);
  });

  it("queries OSV API and normalizes responses properly", async () => {
    const provider = new OsvVulnerabilityProvider({ apiUrl: mockServerUrl });

    // Mock querybatch to return a vulnerability ID
    mockResponseBehavior.status = 200;
    mockResponseBehavior.queryBatchBody = {
      results: [
        {
          vulns: [{ id: "GHSA-abc-123" }],
        },
      ],
    };

    // Set mock body for the subsequent vulnerability details request
    mockResponseBehavior.vulnBodies = {
      "GHSA-abc-123": {
        id: "GHSA-abc-123",
        modified: "2026-06-24T00:00:00Z",
        aliases: ["CVE-2026-1010"],
        summary: "SQL Injection in some-pkg",
        details: "Long details explanation here",
        references: [{ type: "ADVISORY", url: "https://advisories.example.com/GHSA-abc-123" }],
        severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" }],
      },
    };

    const coordinates: PackageCoordinate[] = [
      { ecosystem: "npm", packageName: "some-pkg", version: "2.0.0" },
    ];

    const response = await provider.queryPackages(coordinates);
    expect(response.vulnerabilities).toHaveLength(1);

    const record = response.vulnerabilities[0];
    expect(record.id).toBe("GHSA-abc-123");
    expect(record.aliases).toContain("CVE-2026-1010");
    expect(record.summary).toBe("SQL Injection in some-pkg");
    expect(record.details).toBe("Long details explanation here");
    expect(record.references[0].source).toBe("ADVISORY");
    expect(record.references[0].url).toBe("https://advisories.example.com/GHSA-abc-123");
    expect(record.affectedPackages).toHaveLength(1);
    expect(record.affectedPackages[0].packageName).toBe("some-pkg");
    expect(record.severity).toBeDefined();
    expect(record.severity).toHaveLength(1);
    expect(record.severity![0].type).toBe("CVSS_V3");
    expect(record.severity![0].score).toBe("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");
  });

  it("retries on server errors (5xx) and eventually succeeds", async () => {
    const provider = new OsvVulnerabilityProvider({ apiUrl: mockServerUrl });

    mockResponseBehavior.statusSequence = [500, 500, 200];
    mockResponseBehavior.queryBatchBody = { results: [{ vulns: [] }] };

    const coordinates: PackageCoordinate[] = [
      { ecosystem: "npm", packageName: "some-pkg", version: "2.0.0" },
    ];

    const response = await provider.queryPackages(coordinates);
    expect(response.vulnerabilities).toHaveLength(0);
    expect(mockResponseBehavior.requestCount).toBe(3); // 2 failures + 1 success
  });

  it("throws error after retrying and failing max limit times", async () => {
    const provider = new OsvVulnerabilityProvider({ apiUrl: mockServerUrl });

    mockResponseBehavior.status = 500;
    mockResponseBehavior.queryBatchBody = { error: "Internal Server Error" };

    const coordinates: PackageCoordinate[] = [
      { ecosystem: "npm", packageName: "some-pkg", version: "2.0.0" },
    ];

    await expect(provider.queryPackages(coordinates)).rejects.toThrow("failed with status 500");
    expect(mockResponseBehavior.requestCount).toBe(4); // 1 initial + 3 retries
  });

  it("handles fetch timeouts gracefully", async () => {
    const provider = new OsvVulnerabilityProvider({ apiUrl: mockServerUrl, timeoutMs: 50 });

    mockResponseBehavior.delayMs = 150; // Delay longer than timeout
    mockResponseBehavior.queryBatchBody = { results: [] };

    const coordinates: PackageCoordinate[] = [
      { ecosystem: "npm", packageName: "some-pkg", version: "2.0.0" },
    ];

    await expect(provider.queryPackages(coordinates)).rejects.toThrow();
  });
});
