/**
 * Visual-only preview of the production update meter. Run with
 * `npx --no-install tsx scripts/development/preview-update-progress.ts`.
 * No registry calls, package replacement, or release activation are performed.
 */
import { setTimeout } from "node:timers/promises";
import { renderUpdateProgressBar } from "../../src/foundation/release/update.js";

process.stdout.write("Update progress preview (no installation)\n");
for (let percent = 0; percent <= 100; percent += 1) {
  process.stdout.write(`\r${renderUpdateProgressBar(percent)}`);
  await setTimeout(50);
}
process.stdout.write("\n");
