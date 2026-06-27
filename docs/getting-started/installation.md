# Installation

VulneraScan is distributed as an npm package and runs locally on your machine. It scans projects without sending dependency information to external services, making it suitable for local development and CI environments.

## Prerequisites

Before installing VulneraScan, ensure your environment meets the following requirements:

* Node.js v18 or later
* npm v8 or later
* One of the following operating systems:

  * Linux
  * macOS
  * Windows

No additional tools or services are required.

## Install Globally

Install VulneraScan globally to make the `vulnerascan` command available from any directory.

```bash
npm install -g @hnpsaga/vulnerascan
```

## Run Without Installing

If you prefer not to install the CLI globally, you can execute it directly with `npx`.

```bash
npx @hnpsaga/vulnerascan --help
```

## Verify Your Installation

After installation, verify that the CLI is available.

Check the installed version:

```bash
vulnerascan version
```

Run the built-in health check:

```bash
vulnerascan doctor
```

The doctor command validates your environment by checking:

* Node.js version
* Supported operating system
* CLI installation
* Access to the local VulneraScan configuration directory

If all checks pass, your installation is ready to use.

## Updating

Update an existing global installation with:

```bash
npm install -g @hnpsaga/vulnerascan@latest
```

## Uninstalling

Remove the global installation:

```bash
npm uninstall -g @hnpsaga/vulnerascan
```

To remove local VulneraScan configuration data as well:

```bash
rm -rf ~/.vulnerascan
```

## Next Steps

Once VulneraScan is installed, continue with the Quick Start guide to scan your first project.
