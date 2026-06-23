#!/usr/bin/env node

const VERSION = "0.0.1";

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  console.log(`VulneraScan v${VERSION}`);
  process.exit(0);
}

console.log(`VulneraScan

🚧 Under active development.

Current version: ${VERSION}

This release exists to reserve the npm package name.

Upcoming features:
- Dependency discovery
- Dependency graph generation
- Vulnerability detection
- Multi-language support
- AI-assisted remediation insights

GitHub:
https://github.com/hnpsaga/vulnerascan`);
