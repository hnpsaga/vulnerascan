# Security Policy

## Supported Versions

The following versions of VulneraScan are currently receiving security updates:

| Version | Supported |
| ------- | --------- |
| 0.0.x   | ✅ Active |

---

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in VulneraScan, please follow responsible disclosure practices.

### How to Report

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report vulnerabilities privately via one of these methods:

1. **GitHub Private Security Advisory** (preferred):
   - Go to the [Security Advisories](https://github.com/hnpsaga/vulnerascan/security/advisories/new) page
   - Click **"New draft security advisory"**
   - Fill in the details and submit

2. **Email**:
   - Contact the maintainer directly at the email address listed on the GitHub profile
   - Use the subject line: `[SECURITY] VulneraScan - <brief description>`

---

## What to Include

When reporting a vulnerability, please include as much of the following as possible:

- **Description**: A clear description of the vulnerability and its impact
- **Affected versions**: Which versions are affected
- **Steps to reproduce**: A minimal reproduction of the issue
- **Proof of concept**: Code or commands that demonstrate the issue (if applicable)
- **Suggested fix**: If you have a proposed fix or mitigation

---

## Responsible Disclosure Process

1. **Report received**: We will acknowledge your report within **48 hours**.
2. **Initial assessment**: We will assess the severity and impact within **5 business days**.
3. **Fix development**: We will develop and test a fix.
4. **Coordinated disclosure**: We will notify you before publishing the fix.
5. **Public disclosure**: A security advisory will be published after the fix is released.

We ask that you:

- Give us reasonable time to address the vulnerability before public disclosure
- Do not exploit the vulnerability beyond what is necessary to demonstrate the issue
- Do not disclose the vulnerability publicly until we have released a fix

---

## Security Best Practices for Users

- Always use the latest version of VulneraScan
- Regularly run `vulnerascan doctor` to verify your environment
- Do not run VulneraScan with elevated privileges unless required

---

## Credits

We credit all security researchers who responsibly disclose vulnerabilities to us in our release notes (with their permission).
