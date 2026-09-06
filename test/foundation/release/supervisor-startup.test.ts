import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSupervisorStartupAttempt,
  publishSupervisorStartupResult,
  readSupervisorStartupResult,
  supervisorStartupFailure,
  supervisorStartupReady,
} from "../../../src/foundation/lifecycle/index.js";
import { waitForVerifiedEndpoint, type MaterializedRelease, type SupervisorStartupAttempt } from "../../../src/foundation/release/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("correlated supervisor startup result", () => {
  it("round-trips atomic ready and sanitized failure outcomes", async () => {
    const root = await temporaryRoot();
    const readyAttempt = await createSupervisorStartupAttempt(root, "release-ready");
    await publishSupervisorStartupResult(readyAttempt.resultPath, supervisorStartupReady(readyAttempt.attemptId, readyAttempt.releaseId));
    await expect(readSupervisorStartupResult(readyAttempt.resultPath, readyAttempt.attemptId, readyAttempt.releaseId))
      .resolves.toMatchObject({ outcome: "ready", pid: process.pid });

    const failureAttempt = await createSupervisorStartupAttempt(root, "release-failure");
    const prior = process.env.TEST_SUPERVISOR_SECRET;
    process.env.TEST_SUPERVISOR_SECRET = "credential-value";
    try {
      const failure = supervisorStartupFailure(
        Object.assign(new Error("failed with credential-value\nnext"), { code: "EFAIL" }),
        failureAttempt.attemptId,
        failureAttempt.releaseId,
        "endpoint listen",
      );
      await publishSupervisorStartupResult(failureAttempt.resultPath, failure);
      await expect(readSupervisorStartupResult(failureAttempt.resultPath, failureAttempt.attemptId, failureAttempt.releaseId))
        .resolves.toMatchObject({ outcome: "failure", stage: "endpoint-listen", code: "EFAIL", message: "failed with <redacted> next" });
    } finally {
      if (prior === undefined) delete process.env.TEST_SUPERVISOR_SECRET;
      else process.env.TEST_SUPERVISOR_SECRET = prior;
    }
  });

  it("rejects stale, malformed, oversized, and mismatched results", async () => {
    const root = await temporaryRoot();
    const attempt = await createSupervisorStartupAttempt(root, "release-a");
    await writeFile(attempt.resultPath, "not-json");
    await expect(readSupervisorStartupResult(attempt.resultPath, attempt.attemptId, attempt.releaseId)).rejects.toThrow();

    await writeFile(attempt.resultPath, JSON.stringify({
      schema: "a1-supervisor-startup-v1", attemptId: attempt.attemptId, releaseId: "release-b", outcome: "ready", pid: 1,
    }));
    await expect(readSupervisorStartupResult(attempt.resultPath, attempt.attemptId, attempt.releaseId)).rejects.toThrow(/does not match/);

    const other = await createSupervisorStartupAttempt(root, attempt.releaseId);
    await writeFile(attempt.resultPath, JSON.stringify({
      schema: "a1-supervisor-startup-v1", attemptId: attempt.attemptId, releaseId: attempt.releaseId, outcome: "ready", pid: 1,
    }));
    await expect(readSupervisorStartupResult(attempt.resultPath, other.attemptId, attempt.releaseId)).rejects.toThrow(/does not match/);

    await writeFile(attempt.resultPath, "x".repeat(8 * 1_024 + 1));
    await expect(readSupervisorStartupResult(attempt.resultPath, attempt.attemptId, attempt.releaseId)).rejects.toThrow(/oversized/);
  });

  it("bounds retained completed startup results", async () => {
    const root = await temporaryRoot();
    for (let index = 0; index < 20; index += 1) {
      const attempt = await createSupervisorStartupAttempt(root, `release-${index}`);
      await publishSupervisorStartupResult(attempt.resultPath, supervisorStartupReady(attempt.attemptId, attempt.releaseId));
    }
    const retained = await readdir(resolve(root, "supervisor-startup"));
    expect(retained).toHaveLength(16);
  });

  it("surfaces a matching startup failure before the endpoint timeout", async () => {
    const root = await temporaryRoot();
    const attempt = await createSupervisorStartupAttempt(root, "release-a");
    await publishSupervisorStartupResult(attempt.resultPath, supervisorStartupFailure(
      Object.assign(new Error("cannot bind endpoint"), { code: "EADDRINUSE" }),
      attempt.attemptId,
      attempt.releaseId,
      "endpoint-listen",
    ));
    const startup: SupervisorStartupAttempt = { ...attempt, childOutcome: new Promise(() => undefined) };
    const release = { releaseId: attempt.releaseId } as MaterializedRelease;
    await expect(waitForVerifiedEndpoint(resolve(root, "missing-endpoint.json"), release, 2_000, startup))
      .rejects.toMatchObject({ code: "EADDRINUSE", message: expect.stringContaining("endpoint-listen: cannot bind endpoint") });
  });
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-supervisor-startup-"));
  roots.push(root);
  return root;
}
