/**
 * OSV-specific error types.
 *
 * Transport-level or API-level errors are translated here so that
 * callers outside the OSV module never need to handle raw HTTP errors.
 */

export class OsvApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly endpoint: string,
  ) {
    super(`OSV API ${endpoint} failed with status ${status}: ${statusText}`);
    this.name = "OsvApiError";
  }
}
