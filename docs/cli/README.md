# CLI Command Reference

VulneraScan is a CLI-first vulnerability scanner. You can invoke it using:

```bash
vulnerascan [command] [options]
```

Or run it directly without global installation using:

```bash
npx @hnpsaga/vulnerascan [command] [options]
```

---

## Commands

### `vulnerascan`

Shows general help, usage instructions, and available subcommands.

### `vulnerascan version`

Prints the current version of the tool.

### `vulnerascan doctor`

Checks your environment and local filesystems. Verifies:

- Node.js version compliance (>= 18)
- Target host OS/platform details
- CLI installation and command reachability
- Centralized config directory accessibility (`~/.vulnerascan`)

If the configuration directory does not exist, `doctor` creates it automatically.

### `vulnerascan scan`

Detects the project type in the specified path, resolves dependencies in a safe local workspace, runs the vulnerability scanners, correlates matches, and outputs results.

#### Options

- `-p, --path <path>`: Path to the target project directory (default: current working directory).
- `-o, --output <dir>`: Directory where output reports (Markdown, JSON, CSV) will be written. If omitted, reports are stored only in the local run history.
- `-n, --name <name>`: Custom scan run identifier name.

#### Scan Usage Examples

Scan the current directory and print findings to the console:

```bash
vulnerascan scan
```

Scan a project at a specific location:

```bash
vulnerascan scan --path ~/projects/my-app
```

Scan a project and write standard compliance reports to `./reports/`:

```bash
vulnerascan scan --path ~/projects/my-app --output ./reports
```
