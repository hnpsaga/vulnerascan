# Quick Start

Get up and running with VulneraScan in a few quick steps.

---

## 1. Verify Your Environment

Before starting a scan, check if your current workspace environment has the required manifest files and configurations:

```bash
vulnerascan doctor
```

This will inspect the environment, identify target directories, and check connectivity to the vulnerability database.

---

## 2. Scan Your Repository

To scan your current directory for vulnerabilities, simply run:

```bash
vulnerascan scan
```

VulneraScan will:

1. Discover project manifests.
2. Resolve local dependency graphs.
3. Fetch vulnerability data from the OSV database (utilizing cache if available).
4. Run semantic version checks to isolate vulnerabilities.
5. Print findings directly to the console and store the run results.

---

## 3. View the Dashboard

To start a local dashboard and explore the dependency paths and vulnerability details interactively in your browser:

```bash
vulnerascan dashboard
```

Once started, open the link printed in the terminal (usually `http://localhost:3000`) to access the dashboard.
