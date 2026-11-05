import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export interface ClaimGateHandle { release(): void }
interface NativeGate { tryAcquireGate(path: string): ClaimGateHandle & { readonly acquired: boolean } }
let backend: NativeGate | undefined;

/** No PID-file fallback: only the platform descriptor can prove upgraded-writer exclusion. */
export function tryAcquireClaimGate(path: string): ClaimGateHandle | null {
  if (backend === undefined) {
    const require = createRequire(import.meta.url);
    // Security: resolve only this release's addon, never a binary supplied by tool cwd.
    const own = resolve(fileURLToPath(new URL("../../../", import.meta.url)), "dist", "native", `${process.platform}-${process.arch}`, `${PRODUCT_IDENTITY.artifacts.terminalHostAddon}.node`);
    const override = process.env[PRODUCT_IDENTITY.environment.developmentInstanceId]
      ? process.env[PRODUCT_IDENTITY.environment.terminalHostPath] : undefined;
    for (const candidate of override ? [override, own] : [own]) {
      if (!existsSync(candidate)) continue;
      try {
        const loaded = require(candidate) as { SessionLock?: NativeGate };
        if (typeof loaded.SessionLock?.tryAcquireGate === "function") {
          backend = loaded.SessionLock;
          break;
        }
      } catch { /* An incompatible addon is unavailable, not evidence of lock contention. */ }
    }
  }
  if (backend === undefined) throw Object.assign(new Error("native worktree coordination is unavailable; repair or update this A1 installation and retry"), {
    code: "worktree-coordination-unavailable",
  });
  try {
    const handle = backend.tryAcquireGate(path);
    return handle.acquired ? handle : null;
  } catch (cause) {
    throw Object.assign(new Error("cannot access the worktree mutation gate; check A1 data-directory permissions and filesystem availability", { cause }), {
      code: "worktree-coordination-io",
    });
  }
}
