import { homedir } from "os";
import path from "path";
import fs from "fs";

export interface CacheConfig {
  enabled: boolean;
  ttlHours: number;
}

export interface OsvConfig {
  cache: CacheConfig;
}

export interface ProviderConfig {
  active: string;
  osv?: OsvConfig;
}

export interface VulneraScanConfig {
  provider: ProviderConfig;
}

export const DEFAULT_CONFIG: VulneraScanConfig = {
  provider: {
    active: "osv",
    osv: {
      cache: {
        enabled: true,
        ttlHours: 24,
      },
    },
  },
};

export function validateConfig(config: unknown): VulneraScanConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Configuration must be a valid JSON object");
  }

  const rawConfig = config as Record<string, unknown>;

  if (!rawConfig.provider || typeof rawConfig.provider !== "object") {
    throw new Error("Missing 'provider' configuration section");
  }

  const provider = rawConfig.provider as Record<string, unknown>;
  const active = provider.active;
  if (typeof active !== "string" || !active.trim()) {
    throw new Error("'provider.active' must be a non-empty string");
  }

  const normalizedActive = active.toLowerCase();
  if (normalizedActive !== "osv") {
    throw new Error(`Unsupported provider: '${active}'. Only 'osv' is currently supported.`);
  }

  const validated: VulneraScanConfig = {
    provider: {
      active: normalizedActive,
    },
  };

  if (provider.osv) {
    if (typeof provider.osv !== "object") {
      throw new Error("'provider.osv' must be an object");
    }

    const osv = provider.osv as Record<string, unknown>;
    validated.provider.osv = {
      cache: {
        enabled: true,
        ttlHours: 24,
      },
    };

    if (osv.cache) {
      if (typeof osv.cache !== "object") {
        throw new Error("'provider.osv.cache' must be an object");
      }

      const cache = osv.cache as Record<string, unknown>;

      if (cache.enabled !== undefined) {
        if (typeof cache.enabled !== "boolean") {
          throw new Error("'provider.osv.cache.enabled' must be a boolean");
        }
        validated.provider.osv.cache.enabled = cache.enabled;
      }

      if (cache.ttlHours !== undefined) {
        const ttl = cache.ttlHours;
        if (typeof ttl !== "number" || ttl < 0 || isNaN(ttl)) {
          throw new Error("'provider.osv.cache.ttlHours' must be a non-negative number");
        }
        validated.provider.osv.cache.ttlHours = ttl;
      }
    }
  } else {
    validated.provider.osv = {
      cache: {
        enabled: DEFAULT_CONFIG.provider.osv!.cache.enabled,
        ttlHours: DEFAULT_CONFIG.provider.osv!.cache.ttlHours,
      },
    };
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
    if (msg.includes("must be") || msg.includes("Missing") || msg.includes("Unsupported")) {
      throw err;
    }
  }

  return {
    provider: {
      active: DEFAULT_CONFIG.provider.active,
      osv: {
        cache: {
          enabled: DEFAULT_CONFIG.provider.osv!.cache.enabled,
          ttlHours: DEFAULT_CONFIG.provider.osv!.cache.ttlHours,
        },
      },
    },
  };
}

function getDefaultConfigPath(): string {
  const home = process.env.VULNERASCAN_HOME || homedir();
  return path.join(home, ".vulnerascan", "config.json");
}
