import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createUpdateLifecycleCoordinator, planUpdateOwnership } from "../../../src/foundation/release/index.js";
import { cleanupLiveCohorts, liveCohort, timedPhase } from "./live-cohort-fixture.js";

const residents: number[] = [];
afterEach(async () => {
  for (const pid of residents.splice(0)) {
    try { process.kill(pid, "SIGKILL"); } catch { /* Rationale: the stand-in may already be gone. */ }
  }
  await cleanupLiveCohorts();
});

describe("update ownership with a live cohort", () => {
  it("leaves a cohort running from a retained release alone", async () => {
    const { environment, cohort, terminate } = await liveCohort("retained");
    const stdout: string[] = [];
    const coordinator = createUpdateLifecycleCoordinator(environment, undefined, {
      stdout: message => stdout.push(message),
      stderr: () => {},
    });

    const result = await timedPhase("probe-and-preserve-owner", () => coordinator.shutdownVerifiedOwners("1.3.0"));

    expect(result.priorActiveVersion).toBe("1.2.0");
    expect(terminate).not.toHaveBeenCalled();
    // Invariant: its endpoint is still published, so its sessions can still reach it.
    expect(JSON.parse(await readFile(cohort.endpointMetadataPath, "utf8"))).toMatchObject({ releaseId: expect.any(String) });
  });

  it("stays silent about the sessions it is leaving alone", async () => {
    const { environment } = await liveCohort("retained");
    const stdout: string[] = [];
    const coordinator = createUpdateLifecycleCoordinator(environment, undefined, {
      stdout: message => stdout.push(message),
      stderr: () => {},
    });

    await timedPhase("probe-and-preserve-owner", () => coordinator.shutdownVerifiedOwners("1.3.0"));

    // Rationale: leaving sessions running is the expected outcome; announcing it would tear the
    // update progress bar, so nothing is written.
    expect(stdout.join("")).toBe("");
  });

  it("never signals a resident tab process recorded on the release it updates from", async () => {
    const { environment, release, terminate } = await liveCohort("retained");
    // Platform: resident roles start detached in their own session or process group, like this stand-in.
    const resident = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60_000)"], { detached: true, stdio: "ignore", windowsHide: true });
    resident.unref();
    residents.push(resident.pid!);
    const registry = resolve(environment.A1_DATA_DIR, "tabs", "profile", "registry.json");
    await mkdir(resolve(registry, ".."), { recursive: true });
    const recorded = JSON.stringify({ registryRevision: 1, epoch: 1, bootId: "boot", osSessionId: "session", tabs: [{ tabId: "t1", holderPid: resident.pid, release: release.releaseRoot }] });
    await writeFile(registry, recorded);
    const coordinator = createUpdateLifecycleCoordinator(environment, undefined, { stdout: () => {}, stderr: () => {} });

    await timedPhase("update-with-resident-tab", () => coordinator.shutdownVerifiedOwners("1.3.0"));

    expect(terminate).not.toHaveBeenCalled();
    expect(() => process.kill(resident.pid!, 0)).not.toThrow();
    expect(await readFile(registry, "utf8")).toBe(recorded);
  });

  it("plans by where the owner runs from", () => {
    expect(planUpdateOwnership("dead", true)).toBe("clean-dead-record");
    expect(planUpdateOwnership("dead", false)).toBe("clean-dead-record");
    // Invariant: a session on an installed release keeps working; the installation replaces files it
    // does not read.
    expect(planUpdateOwnership("live-verified", true)).toBe("leave-running");
    // Invariant: a session running from the package being replaced cannot be preserved.
    expect(planUpdateOwnership("live-verified", false)).toBe("end-session");
  });
});
