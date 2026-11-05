import { writeFile } from "node:fs/promises";
import type { SupervisorEndpointMetadata } from "./cohort-state.js";
import { probeOwnership, readEndpointMetadata, removeEndpointArtifacts } from "./endpoints.js";

interface SupervisorRecoveryOptions {
  readonly metadataPath: string;
  readonly endpoint: string;
  readonly matches: (metadata: SupervisorEndpointMetadata) => boolean;
  readonly startAndWait: () => Promise<void>;
}

/** Recover all launch routes identically; a retry never grants permission to kill a live process. */
export async function recoverSupervisorEndpoint(options: SupervisorRecoveryOptions): Promise<void> {
  const { metadataPath, endpoint } = options;
  let recovered = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const metadata = await readEndpointMetadata(metadataPath);
    if (metadata) {
      const probe = await probeOwnership(metadata);
      if (probe === "live-verified" && options.matches(metadata)) {
        if (recovered) await diagnostic(metadataPath, "recovered", attempt + 1);
        return;
      }
      // Concurrency: another owner may have published while an earlier identity probe was pending.
      if (JSON.stringify(await readEndpointMetadata(metadataPath)) !== JSON.stringify(metadata)) continue;
      if (probe !== "dead") {
        await diagnostic(metadataPath, probe, attempt + 1);
        throw Object.assign(new Error(probe === "unresponsive"
          ? "A1's background service is not responding; retry shortly. Your sessions have been preserved."
          : "A1's background service identity changed; retry startup. Your sessions have been preserved."), {
          code: "SUPERVISOR_RECOVERY_BLOCKED",
        });
      }
      recovered = true;
      if (!await removeEndpointArtifacts(metadataPath, endpoint, metadata)) continue;
      await diagnostic(metadataPath, "stale-owner-retired", attempt + 1);
    }
    // Concurrency: the child takes the same endpoint gate before binding/publication. If another launch wins,
    // startAndWait joins its authenticated endpoint; it never unlinks that winner's socket.
    await options.startAndWait();
    if (recovered) await diagnostic(metadataPath, "recovered", attempt + 1);
    return;
  }
  await diagnostic(metadataPath, "ownership-changing", 3);
  throw Object.assign(new Error("A1 startup changed repeatedly; retry shortly"), { code: "SUPERVISOR_RECOVERY_BUSY" });
}

async function diagnostic(path: string, reason: string, attempts: number): Promise<void> {
  // Security: one bounded summary per endpoint, no raw metadata, user paths, or session content.
  await writeFile(`${path}.recovery.json`, JSON.stringify({ reason, attempts, at: new Date().toISOString() }), { mode: 0o600 }).catch(() => undefined);
}
