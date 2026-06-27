# Installation

This guide walks you through the options for installing and running VulneraScan.

---

## Prerequisites

To run VulneraScan, ensure you have the following installed on your system:

- **Node.js**: version `18.0.0` or higher is recommended.
- **npm**: version `8.0.0` or higher.

---

## Install Globally

You can install VulneraScan globally to make the `vulnerascan` command available anywhere on your system:

```bash
npm install -g @hnpsaga/vulnerascan
```

---

## Run with npx

If you prefer not to install the package globally, you can run VulneraScan on demand using `npx`:

```bash
npx @hnpsaga/vulnerascan --help
```

---

## Verify the Installation

Once installed, you can check that the CLI is working by printing the version:

```bash
vulnerascan version
```

Or check your workspace readiness:

```bash
vulnerascan doctor
```
