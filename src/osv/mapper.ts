import {
  PackageCoordinate,
  RichVulnerabilityRecord,
} from "../vulnerability/vulnerability-models.js";

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
): RichVulnerabilityRecord {
  const affectedDetail = (osv.affected || []).map((aff) => ({
    ecosystem: aff.package?.ecosystem || "",
    packageName: aff.package?.name || "",
    versions: aff.versions || [],
    ranges: (aff.ranges || []).map((range) => ({
      type: range.type,
      events: (range.events || []).map((event) => ({
        introduced: event.introduced,
        fixed: event.fixed,
        lastAffected: event.last_affected,
      })),
    })),
  }));

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
    published: osv.published,
    modified: osv.modified,
    affectedDetail,
  };
}

/**
 * Merges duplicate VulnerabilityRecords by id, combining their affectedPackages.
 */
export function mergeVulnerabilityRecords(
  records: RichVulnerabilityRecord[],
): RichVulnerabilityRecord[] {
  const merged = new Map<string, RichVulnerabilityRecord>();
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
      // Also combine affectedDetail if present
      if (record.affectedDetail && existing.affectedDetail) {
        // Keep unique details or just concat
        for (const detail of record.affectedDetail) {
          const detailExists = existing.affectedDetail.some(
            (d) => d.ecosystem === detail.ecosystem && d.packageName === detail.packageName,
          );
          if (!detailExists) {
            existing.affectedDetail.push(detail);
          }
        }
      }
    } else {
      merged.set(record.id, {
        ...record,
        affectedPackages: [...record.affectedPackages],
        affectedDetail: record.affectedDetail ? [...record.affectedDetail] : undefined,
      });
    }
  }
  return Array.from(merged.values());
}
