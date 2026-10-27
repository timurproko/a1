import { rm } from "node:fs/promises";
import { describeSurvivors, stopCheckoutProcesses } from "./development/stop-checkout-processes.mjs";

// Rationale: a running A1 from this checkout locks its native addon on Windows; stop it first. The
// stop converges on its own and is silent unless something survived it.
const { survivors } = await stopCheckoutProcesses();
process.stderr.write(describeSurvivors(survivors));
await rm(new URL("../dist", import.meta.url), { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
