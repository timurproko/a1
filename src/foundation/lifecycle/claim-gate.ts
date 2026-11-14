// Concurrency: repository cleanup and attachment must use the same non-expiring primitive, including across releases.
export { tryAcquireClaimGate } from "./claim-gate-core.mjs";
