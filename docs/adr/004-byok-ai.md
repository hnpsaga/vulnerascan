# ADR-004: Bring-Your-Own-Key (BYOK) AI Architecture

## Status

Proposed

## Date

2026-06-23

## Context

VulneraScan plans to offer AI-assisted remediation insights — natural language explanations of vulnerabilities and suggested fixes. This requires calling a large language model (LLM) API.

Embedding an AI API key or hosting inference infrastructure introduces:

- **Cost burden**: LLM inference is expensive at scale
- **Privacy concerns**: Sending user code/dependency data to a third-party AI service without explicit consent
- **Vendor lock-in**: Tying the tool to a single AI provider
- **Trust issues**: Users may not want their dependency graph sent to any external service

## Decision

We will adopt a **Bring-Your-Own-Key (BYOK)** model for all AI features. AI-powered features are strictly **opt-in** and require users to supply their own LLM API credentials.

## Architecture

AI features will be implemented as an optional provider layer (extending ADR-003):

```typescript
interface AIProvider {
  /** Human-readable name (e.g. "OpenAI GPT-4o", "Anthropic Claude") */
  name: string;

  /** Explain a vulnerability in plain language */
  explainVulnerability(vulnerability: Vulnerability): Promise<string>;

  /** Suggest remediation steps for a vulnerability */
  suggestRemediation(vulnerability: Vulnerability, context: ProjectContext): Promise<string>;
}
```

## Supported Providers _(planned)_

| Provider       | Model                 | Configuration Key   |
| -------------- | --------------------- | ------------------- |
| OpenAI         | GPT-4o, GPT-4-turbo   | `OPENAI_API_KEY`    |
| Anthropic      | Claude 3.5 Sonnet     | `ANTHROPIC_API_KEY` |
| Google         | Gemini 1.5 Pro        | `GOOGLE_API_KEY`    |
| Local (Ollama) | llama3, mistral, etc. | `OLLAMA_BASE_URL`   |

## Configuration

Users configure AI via environment variables or `~/.vulnerascan/config.json`:

```json
{
  "ai": {
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

## Data Privacy Guarantees

- **No telemetry**: VulneraScan never sends data to external services without explicit user action.
- **Explicit consent**: AI features are disabled by default and must be explicitly enabled.
- **Local option**: Ollama support allows fully local inference with no external API calls.
- **Minimal context**: Only the specific vulnerability ID and affected package are sent; source code is never sent.

## Consequences

- AI features are entirely optional. The core scanner functions without any AI configuration.
- Users retain full control over which AI provider receives their data.
- New AI providers can be added by implementing `AIProvider`.
- Local inference via Ollama provides a zero-trust option for sensitive environments.
- AI features will not be implemented until v0.3.0.

## Alternatives Considered

| Alternative                    | Rejected Because                                          |
| ------------------------------ | --------------------------------------------------------- |
| Hosted AI with shared key      | Cost at scale, privacy risk, central server dependency    |
| Only one AI provider supported | Vendor lock-in, limits user choice                        |
| AI features built into core    | Forces dependency on AI SDK for all users, bloats package |
| No AI features at all          | Misses a significant developer experience opportunity     |
