import { VulnerabilityProvider } from "../interfaces/vulnerability-provider.js";

export class ProviderRegistry {
  private providers = new Map<string, VulnerabilityProvider>();

  register(provider: VulnerabilityProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  resolve(name: string): VulnerabilityProvider {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new Error(`Vulnerability provider '${name}' is not registered.`);
    }
    return provider;
  }

  getRegisteredNames(): string[] {
    return Array.from(this.providers.keys());
  }
}
