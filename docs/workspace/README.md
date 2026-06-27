# Global Workspace & Run Registry

VulneraScan keeps all tracking data entirely local. Scans, dependency graphs, project locations, and historic results are structured in a filesystem directory schema under the VulneraScan home environment path (defaulting to `~/.vulnerascan/`).

## Workspace Directory Layout

```text
~/.vulnerascan/
├── projects.json                  # Central registry tracking all local repositories
└── workspaces/
    └── <workspace_id>/            # Unique directory derived from project path hash
        ├── workspace.json         # Project path and identity details
        ├── metadata.json          # Cached project stats, latest scan status, counts
        ├── run-index.json         # Timeline directory indexing all scan runs
        └── runs/
            └── <run_timestamp>/   # Individual execution folder containing reports/artifacts
                ├── run.json
                ├── discovery.json
                └── vulnerabilities.json
```

## Key Components

- **Project Registry (`projects.json`)**: Serves as the index of all registered directories. Enables VulneraScan tools to query and view overall project summaries without traversing folders.
- **Run Index (`run-index.json`)**: Timestamps and execution records for the workspace. Allows the CLI and Dashboard to show historical progression.
- **Run Subdirectories**: Contains specific execution states. Preserves the parsed dependency graph and matched vulnerability findings.
