# ADR-002: Plugin Architecture for Ecosystem Scanners

## Status

Proposed

## Date

2026-06-23

## Context

VulneraScan targets multiple language ecosystems: npm, Maven, Gradle, pip, and others. Each ecosystem has a different manifest format, dependency resolution algorithm, and registry.

Building all ecosystem support directly into the core package would result in:

- A large binary with many optional dependencies
- A monolithic codebase that is difficult to maintain
- No clear extension point for third-party ecosystems

## Decision

We will implement a **plugin architecture** where each ecosystem scanner is a discrete, independently distributable plugin.

## Plugin Interface

Each plugin will implement a standard `EcosystemPlugin` interface:

```typescript
interface EcosystemPlugin {
  /** Unique identifier for this ecosystem */
  name: string;

  /** File patterns that indicate this ecosystem is present */
  manifestPatterns: string[];

  /** Discover and parse dependencies from a manifest file */
  parseDependencies(manifestPath: string): Promise<Dependency[]>;

  /** Resolve transitive dependencies */
  resolveTransitive(dependencies: Dependency[]): Promise<DependencyGraph>;
}
```

## Plugin Discovery

Plugins will be discovered via:

1. **Built-in plugins**: Bundled in the `@hnpsaga/vulnerascan` package for tier-1 ecosystems (npm).
2. **npm-installed plugins**: Packages following the naming convention `vulnerascan-plugin-<ecosystem>`.
3. **Local plugins**: Defined in `~/.vulnerascan/plugins.json`.

## Consequences

- Core package remains lean; ecosystem support is opt-in.
- Third parties can publish plugins for unsupported ecosystems.
- Plugin versioning is independent of core versioning.
- Plugin API changes must be versioned and backwards-compatible.
- Built-in plugins (npm) will be developed first in v0.0.2–v0.1.0.

## Alternatives Considered

| Alternative                | Rejected Because                                              |
| -------------------------- | ------------------------------------------------------------- |
| Monolithic core            | Bloated package size, poor maintainability                    |
| Separate CLI per ecosystem | No unified interface, poor UX                                 |
| WASM-based plugins         | Adds significant complexity for minimal benefit at this stage |
