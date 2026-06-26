import { PackageCoordinate, VulnerabilityRecord } from "../vulnerability/vulnerability-models.js";
import { OsvVulnerability } from "./models.js";

/**
 * Maps an ecosystem name to the canonical OSV ecosystem string.
 */
export function mapToOsvEcosystem(ecosystem: string): string {
  const normalized = ecosystem.toLowerCase();
  switch (normalized) {
    case "npm":
      return "npm";
    case "maven":
    case "gradle":
      return "Maven";
    case "python":
    case "pypi":
      return "PyPI";
    case "go":
      return "Go";
    case "rust":
    case "cargo":
    case "crates.io":
      return "crates.io";
    case "nuget":
    case ".net":
      return "NuGet";
    case "php":
    case "packagist":
      return "Packagist";
    case "ruby":
    case "rubygems":
      return "RubyGems";
    default:
      return ecosystem;
  }
}

/**
 * Converts a raw OSV vulnerability response into a normalized VulnerabilityRecord.
 */
export function mapOsvVulnerability(
  osv: OsvVulnerability,
  affectedPkg: PackageCoordinate,
): VulnerabilityRecord {
  return {
    id: osv.id,
    aliases: osv.aliases || [],
    summary: osv.summary || "",
    details: osv.details || "",
    references: (osv.references || []).map((ref) => ({
      source: ref.type || "WEB",
      identifier: ref.url,
      url: ref.url,
    })),
    affectedPackages: [affectedPkg],
    severity: osv.severity,
  };
}

/**
 * Merges duplicate VulnerabilityRecords by id, combining their affectedPackages.
 */
export function mergeVulnerabilityRecords(records: VulnerabilityRecord[]): VulnerabilityRecord[] {
  const merged = new Map<string, VulnerabilityRecord>();
  for (const record of records) {
    const existing = merged.get(record.id);
    if (existing) {
      const seen = new Set(
        existing.affectedPackages.map((p) => `${p.ecosystem}:${p.packageName}@${p.version}`),
      );
      for (const pkg of record.affectedPackages) {
        const key = `${pkg.ecosystem}:${pkg.packageName}@${pkg.version}`;
        if (!seen.has(key)) {
          existing.affectedPackages.push(pkg);
          seen.add(key);
        }
      }
    } else {
      merged.set(record.id, {
        ...record,
        affectedPackages: [...record.affectedPackages],
      });
    }
  }
  return Array.from(merged.values());
}
