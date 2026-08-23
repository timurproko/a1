// Install-time entry for the pi-tui module-identity repair (bin/module-identity.js
// holds the logic and rationale; the same repair also runs at every launch from
// bin/ui.js). Wired into `prepare` so a source checkout gets a unified tree right
// after `npm install` — tests then exercise the same module identities as launches.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { ensureSinglePiTuiModule } from "../bin/module-identity.js";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outcome = ensureSinglePiTuiModule(packageRoot);
if (outcome.kind === "version-mismatch") {
  console.error(`unify-pi-tui: refusing to link pi-tui ${outcome.rootVersion} (root) onto ${outcome.nestedVersion} (nested); align the versions first.`);
  process.exit(1);
}
if (outcome.kind === "failed") {
  console.error(`unify-pi-tui: ${outcome.message}`);
  process.exit(1);
}
if (outcome.kind === "linked") {
  console.log("unify-pi-tui: root @earendil-works/pi-tui now resolves to pinned Pi's copy");
}
