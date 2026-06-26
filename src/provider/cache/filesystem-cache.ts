import {
  PackageCoordinate,
  VulnerabilityRecord,
} from "../../vulnerability/vulnerability-models.js";
import { VulnerabilityCache } from "../interfaces/vulnerability-cache.js";
import path from "path";
import fs from "fs";

export class FilesystemVulnerabilityCache implements VulnerabilityCache {
  private cacheDir: string;
  private ttlMs: number;

  constructor(cacheDir: string, ttlHours: number = 24) {
    this.cacheDir = cacheDir;
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  private getFilePath(coordinate: PackageCoordinate): string {
    const sanitizedEcosystem = coordinate.ecosystem.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
    const sanitizedName = coordinate.packageName.replace(/[^a-zA-Z0-9.-]/g, "-");
    const sanitizedVersion = coordinate.version.replace(/[^a-zA-Z0-9.-]/g, "-");
    return path.join(
      this.cacheDir,
      `${sanitizedEcosystem}-${sanitizedName}-${sanitizedVersion}.json`,
    );
  }

  async get(coordinate: PackageCoordinate): Promise<VulnerabilityRecord[] | null> {
    const filePath = this.getFilePath(coordinate);
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const stat = await fs.promises.stat(filePath);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs > this.ttlMs) {
        return null;
      }

      const content = await fs.promises.readFile(filePath, "utf8");
      return JSON.parse(content) as VulnerabilityRecord[];
    } catch {
      return null;
    }
  }

  async set(coordinate: PackageCoordinate, vulnerabilities: VulnerabilityRecord[]): Promise<void> {
    const filePath = this.getFilePath(coordinate);
    try {
      const parentDir = path.dirname(filePath);
      if (!fs.existsSync(parentDir)) {
        await fs.promises.mkdir(parentDir, { recursive: true });
      }
      await fs.promises.writeFile(filePath, JSON.stringify(vulnerabilities, null, 2), "utf8");
    } catch {
      // Gracefully ignore filesystem write errors (e.g. read-only permissions)
    }
  }
}
