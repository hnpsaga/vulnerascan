# Dependency Graph Engine

The Dependency Graph Engine (introduced in v0.0.5) is a core component of VulneraScan. It constructs a resolved, ecosystem-agnostic representation of all direct and transitive dependencies in a project. This graph serves as the foundation for vulnerability correlation, scan comparison, dashboard visualizations, and AI remediation.

---

## Graph Schema

The output artifact is named `dependency-graph.json` and is saved within the scan run's directory. It is fully deterministic, meaning subsequent runs on the same project produce bit-identical files.

### 1. Root Structure

```json
{
  "schemaVersion": 1,
  "projectType": "node",
  "packageManager": "npm",
  "nodes": [],
  "edges": []
}
```

- **`schemaVersion`**: `number`. Schema version of the graph format (starts at `1`).
- **`projectType`**: `string`. The project type discovered (e.g., `"node"`).
- **`packageManager`**: `string`. The package manager used (e.g., `"npm"`).
- **`nodes`**: `DependencyNode[]`. Sorted alphabetically by package identity.
- **`edges`**: `DependencyEdge[]`. Sorted alphabetically by source then target.

---

### 2. Node Model (`DependencyNode`)

Each node represents a unique package version resolved in the project workspace, including the root application itself.

| Field            | Type       | Description                                                                                                                                                                                                                       |
| ---------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`   | Stable ecosystem-scoped package identifier (e.g., `"npm:foo@1.0.0"`).                                                                                                                                                             |
| `name`           | `string`   | Name of the package (e.g., `"foo"`).                                                                                                                                                                                              |
| `version`        | `string`   | Resolved package version (e.g., `"1.0.0"`).                                                                                                                                                                                       |
| `ecosystem`      | `string`   | Target package ecosystem (e.g., `"npm"`).                                                                                                                                                                                         |
| `dependencyType` | `string`   | The dependency type category: `"production"`, `"development"`, `"optional"`, or `"peer"`.                                                                                                                                         |
| `isDirect`       | `boolean`  | Flag indicating if this package is a direct dependency of the root project.                                                                                                                                                       |
| `isTransitive`   | `boolean`  | Flag indicating if this package is a transitive dependency introduced by another package.                                                                                                                                         |
| `parents`        | `string[]` | Alphabetically sorted array of parent node IDs.                                                                                                                                                                                   |
| `children`       | `string[]` | Alphabetically sorted array of child node IDs.                                                                                                                                                                                    |
| `depth`          | `number`   | Computed/derived metadata representing the shortest dependency distance from the project root (0 for the root project itself), calculated via Breadth-First Search (BFS). It is not an intrinsic property of the graph structure. |
| `packageManager` | `string`   | Optional/Reference to the package manager that resolved the package (e.g., `"npm"`).                                                                                                                                              |
| `manifest`       | `string`   | Optional/Reference to the manifest file specifying the package (e.g., `"package.json"`).                                                                                                                                          |

---

### 3. Edge Model (`DependencyEdge`)

Edges define the relationships between parent packages and child packages.

- **`source`**: `string`. The parent package node ID.
- **`target`**: `string`. The child package node ID.

---

## Example Graph Artifact (`dependency-graph.json`)

Here is an example output generated for a project with one direct dependency (`foo`), one dev dependency (`bar`), and a transitive dependency (`baz` required by `bar`):

```json
{
  "schemaVersion": 1,
  "projectType": "node",
  "packageManager": "npm",
  "nodes": [
    {
      "id": "npm:bar@2.0.0",
      "name": "bar",
      "version": "2.0.0",
      "ecosystem": "npm",
      "dependencyType": "development",
      "isDirect": true,
      "isTransitive": false,
      "parents": ["npm:node-with-lockfile@1.0.0"],
      "children": ["npm:baz@3.0.0"],
      "depth": 1,
      "packageManager": "npm",
      "manifest": "package.json"
    },
    {
      "id": "npm:baz@3.0.0",
      "name": "baz",
      "version": "3.0.0",
      "ecosystem": "npm",
      "dependencyType": "development",
      "isDirect": false,
      "isTransitive": true,
      "parents": ["npm:bar@2.0.0"],
      "children": [],
      "depth": 2,
      "packageManager": "npm",
      "manifest": "package.json"
    },
    {
      "id": "npm:foo@1.0.0",
      "name": "foo",
      "version": "1.0.0",
      "ecosystem": "npm",
      "dependencyType": "production",
      "isDirect": true,
      "isTransitive": false,
      "parents": ["npm:node-with-lockfile@1.0.0"],
      "children": [],
      "depth": 1,
      "packageManager": "npm",
      "manifest": "package.json"
    },
    {
      "id": "npm:node-with-lockfile@1.0.0",
      "name": "node-with-lockfile",
      "version": "1.0.0",
      "ecosystem": "npm",
      "dependencyType": "production",
      "isDirect": false,
      "isTransitive": false,
      "parents": [],
      "children": ["npm:bar@2.0.0", "npm:foo@1.0.0"],
      "depth": 0,
      "packageManager": "npm",
      "manifest": "package.json"
    }
  ],
  "edges": [
    {
      "source": "npm:bar@2.0.0",
      "target": "npm:baz@3.0.0"
    },
    {
      "source": "npm:node-with-lockfile@1.0.0",
      "target": "npm:bar@2.0.0"
    },
    {
      "source": "npm:node-with-lockfile@1.0.0",
      "target": "npm:foo@1.0.0"
    }
  ]
}
```

---

## Graph Generation Process

The generation process uses a queue-based traversal starting from the root manifest definitions:

1. **Manifest Flattening (Lockfile v1)**: If a legacy lockfile (v1) is detected, the recursive dependency tree is flattened into a flat map of virtual `node_modules` path keys to align with the lockfile v2/v3 structure.
2. **Symlink Workspace Tracking**: Monorepo workspace links (`link: true`) are resolved by reading details from the target workspace directory mapping, ensuring package versions and scopes in workspaces are resolved correctly.
3. **Queue Initialization**: The queue is initialized with the direct dependencies of the root package categorized by their dependency fields (`dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies`).
4. **Breadth-First Traversal & Derived Metadata**:
   - Each package path is traversed.
   - Standard Node.js module resolution is simulated to locate the child dependency node's physical path.
   - A Breadth-First Search (BFS) is executed to calculate the shortest path distance (`depth`) from the project root for each node.
   - Additional helper metadata, such as `packageManager` and `manifest` references, is assigned during this traversal.
   - Circular dependencies are tracked using a path-to-type lookup, preventing infinite loops while still recording all circular edges.
   - Precedence-based merging (`production` > `development` > `optional` > `peer`) is applied when a package is reached via multiple paths. If a package is visited with a higher-priority type, the new type is recursively propagated to its children.
5. **Post-Processing**: Parent/child lists are populated on all nodes, and the entire graph structure is sorted alphabetically for deterministic JSON output.

---

## Derived Graph Metadata

The dependency graph consists fundamentally of nodes (packages) and edges (dependencies). Helper properties such as `depth` are **derived/computed metadata** rather than intrinsic attributes of the graph structure.

### Design Philosophy

- **Downstream Simplicity**: Derived metadata is computed during the graph generation phase to simplify downstream consumers (e.g., reporting, filtering, terminal visualizations, and future vulnerability correlation). By embedding these pre-computed helper values, downstream tools can read relationship contexts directly from each node without running expensive graph traversals themselves.
- **Separation of Concerns**: Calculating graph-derived metadata is strictly the responsibility of the Dependency Graph Generation stage. Downstream stages (like vulnerability analysis or future remediation layers) consume this metadata but do not alter or own it.

### Calculation and Recomputation

- **BFS Computation**: The `depth` property represents the shortest dependency distance from the project root. It is calculated dynamically during graph generation using Breadth-First Search (BFS) traversal.
- **Transient Nature**: Because `depth` is a derived property, it is not persisted as canonical source truth. If the underlying node or edge structure changes, `depth` must be recalculated to remain valid. Consumers must treat it as computed metadata that can always be reconstructed from the primary nodes and edges.

---

## Future Extensibility Considerations

The Dependency Graph schema is designed to support the roadmap through v0.5.x:

- **Ecosystem Portability**: The node structure requires only `ecosystem`, `name`, and `version`. Future modules for PyPI, Maven, Go, Cargo, etc., can use the exact same schema.
- **Scan Comparison / Diffing**: Since identifiers (`id`) are stable and outputs are deterministic, scan comparison engines can easily diff two graphs by doing simple set differences on the `nodes` and `edges` lists to identify upgrades, downgrades, additions, and removals.
- **Vulnerability Correlation & Dashboard Tracing**: The explicit presence of `parents` and `children` arrays enables the dashboard and AI engines to reconstruct path chains (e.g. `app -> react-scripts -> webpack -> chokidar`) without needing complex in-memory graph queries.
