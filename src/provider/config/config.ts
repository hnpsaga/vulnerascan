import { homedir } from "os";
import path from "path";
import fs from "fs";

export interface CacheConfig {
  enabled: boolean;
  ttlHours: number;
}

export interface VulneraScanConfig {
  cache: CacheConfig;
}

export const DEFAULT_CONFIG: VulneraScanConfig = {
  cache: {
    enabled: true,
    ttlHours: 24,
  },
};

export function validateConfig(config: unknown): VulneraScanConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Configuration must be a valid JSON object");
  }

  const rawConfig = config as Record<string, unknown>;
  const validated: VulneraScanConfig = {
    cache: {
      enabled: true,
      ttlHours: 24,
    },
  };

  if (rawConfig.cache) {
    if (typeof rawConfig.cache !== "object") {
      throw new Error("'cache' must be an object");
    }

    const cache = rawConfig.cache as Record<string, unknown>;

    if (cache.enabled !== undefined) {
      if (typeof cache.enabled !== "boolean") {
        throw new Error("'cache.enabled' must be a boolean");
      }
      validated.cache.enabled = cache.enabled;
    }

    if (cache.ttlHours !== undefined) {
      const ttl = cache.ttlHours;
      if (typeof ttl !== "number" || ttl < 0 || isNaN(ttl)) {
        throw new Error("'cache.ttlHours' must be a non-negative number");
      }
      validated.cache.ttlHours = ttl;
    }
  }

  return validated;
}

export function loadConfig(configPath?: string): VulneraScanConfig {
  const finalPath = configPath || getDefaultConfigPath();

  try {
    if (fs.existsSync(finalPath)) {
      const content = fs.readFileSync(finalPath, "utf8");
      const parsed = JSON.parse(content) as unknown;
      return validateConfig(parsed);
    }
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("must be") || msg.includes("'cache' must be")) {
      throw err;
    }
  }

  return {
    cache: {
      enabled: DEFAULT_CONFIG.cache.enabled,
      ttlHours: DEFAULT_CONFIG.cache.ttlHours,
    },
  };
}

function getDefaultConfigPath(): string {
  const home = process.env.VULNERASCAN_HOME || homedir();
  return path.join(home, ".vulnerascan", "config.json");
}
