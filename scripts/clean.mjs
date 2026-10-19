import { rm } from "node:fs/promises";
import { stopCheckoutProcesses } from "./development/stop-checkout-processes.mjs";

// Rationale: a running A1 from this checkout locks its native addon on Windows; stop it first.
const stopped = stopCheckoutProcesses();
if (stopped.length > 0) {
  process.stderr.write(`Stopped ${stopped.length} running A1 process(es) from this checkout before rebuilding.\n`);
  // Platform: Windows releases a terminated process's file handles shortly after it exits.
  await new Promise(resolveDelay => setTimeout(resolveDelay, 500));
}
await rm(new URL("../dist", import.meta.url), { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
