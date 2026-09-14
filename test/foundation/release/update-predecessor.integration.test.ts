import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PredecessorFixture } from "../../support/predecessor-fixture.js";
import { loadValidationCandidate } from "./package-candidate-fixture.js";

/**
 * The published predecessors drive this gate. An update is performed by the code that is
 * already installed, so a private handoff can only be proven compatible by running the
 * previous release's own copy of it against the candidate payload. Fixtures built from
 * the candidate cannot show this: both sides would speak whatever the candidate speaks.
 */
const PREDECESSOR_COUNT = Number.parseInt(process.env.UPDATE_PREDECESSOR_COUNT ?? "3", 10);
const fixture = new PredecessorFixture();
let candidateRoot = "";
let predecessors: string[] = [];

beforeAll(async () => fixture.phase(900_000, async () => {
  const candidate = await loadValidationCandidate();
  candidateRoot = await fixture.install(candidate.path);
  predecessors = await fixture.publishedVersions(candidate.manifest.version);
  expect(predecessors.length, "no published release is available to update from").toBeGreaterThan(0);
}), 900_000);

afterAll(async () => fixture.close(), 120_000);

describe("update from every recent published release", () => {
  it("materializes and warms the candidate with each predecessor's own release code", async ({ signal }) => fixture.phase(1_800_000, async phaseSignal => {
    let exercised = 0;
    for (const version of predecessors) {
      phaseSignal.throwIfAborted();
      if (exercised >= PREDECESSOR_COUNT) break;
      const priorRoot = await fixture.install(`@timurproko/a1@${version}`, version);
      const entry = resolve(priorRoot, "dist", "foundation", "release", "index.js");
      // Rationale: releases older than the immutable release store cannot drive this
      // handoff at all; they are skipped by absence of the entry, never by version
      // guesswork, and the run still has to exercise a real predecessor.
      if (!existsSync(entry)) continue;
      exercised += 1;
      const release = await import(pathToFileURL(entry).href) as {
        materializeRelease: (packageRoot: string, dataDir: string) => Promise<{ releaseId: string }>;
        warmMaterializedRelease: (release: unknown, environment: NodeJS.ProcessEnv, timeoutMs?: number) => Promise<void>;
      };
      const sandbox = await fixture.temporaryRoot("a1-predecessor-");
      const environment = {
        ...process.env,
        A1_DATA_DIR: resolve(sandbox, "data"),
        A1_RUNTIME_DIR: resolve(sandbox, "runtime"),
        A1_CONFIG_DIR: resolve(sandbox, "config"),
        A1_DATABASE_PATH: resolve(sandbox, "control.sqlite3"),
      };
      // Protocol: the predecessor copies the candidate payload and then imports the candidate's own
      // startup graph in a child process, exactly as `a1 update` does.
      const materialized = await fixture.measure("materialize", version, () => release.materializeRelease(candidateRoot, environment.A1_DATA_DIR));
      phaseSignal.throwIfAborted();
      await expect(
        fixture.measure("warm", version, () => release.warmMaterializedRelease(materialized, environment, 120_000)),
        `published ${version} cannot activate the candidate`,
      ).resolves.toBeUndefined();
    }
    expect(exercised, "no published release carried a usable release store to update from").toBeGreaterThan(0);
  }, signal), 1_800_000);
});
