/**
 * Public surface of the OSV module.
 *
 * Only `OsvClient` and `OsvScanResult` are exported.
 * All OSV implementation details (raw models, mapper, errors, cache) remain private.
 */
export { OsvClient } from "./client.js";
export type { OsvScanResult } from "./client.js";
