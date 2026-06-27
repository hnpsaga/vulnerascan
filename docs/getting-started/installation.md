# Installation

This guide explains how to install VulneraScan and verify that your installation is ready to use.

VulneraScan can be installed as a native CLI using npm, executed directly with `npx`, or run in an isolated Docker container.

## Prerequisites

Choose the installation method that best matches your workflow.

### npm / npx

Requirements:

* Node.js 18 or later
* npm 8 or later

Supported platforms:

* Linux
* macOS
* Windows

### Docker

Requirements:

* Docker Engine

Docker is recommended if you prefer an isolated runtime or do not want to install Node.js locally.

---

# Install with npm

Install the latest version globally:

```bash
npm install -g @hnpsaga/vulnerascan
```

After installation, verify the installed version:

```bash
vulnerascan version
```

Then verify your environment:

```bash
vulnerascan doctor
```

The `doctor` command checks that your environment is correctly configured and reports any missing tooling required for the ecosystems you intend to scan.

---

# Run with npx

If you don't want to install VulneraScan globally, execute it directly from npm:

```bash
npx @hnpsaga/vulnerascan --help
```

You can execute any CLI command using the same pattern:

```bash
npx @hnpsaga/vulnerascan scan
```

---

# Run with Docker

Pull the latest image:

```bash
docker pull ghcr.io/hnpsaga/vulnerascan:latest
```

Run a scan against the current project:

```bash
docker run --rm \
  -v $(pwd):/project \
  -v ~/.vulnerascan:/root/.vulnerascan \
  ghcr.io/hnpsaga/vulnerascan:latest \
  scan
```

The mounted workspace persists scan history, reports, caches, and dashboard data across container runs.

---

# Launch the Dashboard

Start the dashboard server:

```bash
docker run --rm \
  -p 4000:4000 \
  -v ~/.vulnerascan:/root/.vulnerascan \
  ghcr.io/hnpsaga/vulnerascan:latest \
  dashboard
```

Open your browser and navigate to:

```text
http://localhost:4000
```

Unlike native installations, Docker containers do not automatically open your browser.

---

# Updating

## npm

Update to the latest version:

```bash
npm install -g @hnpsaga/vulnerascan@latest
```

## Docker

Pull the latest image:

```bash
docker pull ghcr.io/hnpsaga/vulnerascan:latest
```

---

# Uninstalling

## npm

Remove the global installation:

```bash
npm uninstall -g @hnpsaga/vulnerascan
```

To remove all local VulneraScan data:

```bash
rm -rf ~/.vulnerascan
```

## Docker

Remove the image:

```bash
docker rmi ghcr.io/hnpsaga/vulnerascan:latest
```

If you used a persistent Docker volume or host directory for the workspace, remove it separately if it is no longer needed.

---

# Notes

* Native installations use your locally installed ecosystem tooling to resolve project dependencies.
* The `doctor` command reports which ecosystem tools are available and helps identify any missing dependencies before running a scan.
* Docker bundles the runtime required to execute VulneraScan, but the mounted project remains unchanged. All workspace data is stored separately from your source code.

---

# Next Steps

Once VulneraScan is installed and your environment is verified, continue to the Quick Start guide to perform your first scan and explore the available commands.
