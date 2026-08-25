import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const checker = resolve("scripts/check-pinned-pi-source-ledger.mjs");
const ledgerPath = resolve("config/baselines/pinned-pi-source-port-ledger.json");
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

async function ledgerFixture(): Promise<Record<string, any>> {
  return JSON.parse(await readFile(ledgerPath, "utf8")) as Record<string, any>;
}

async function runFixture(
  mutate: (ledger: Record<string, any>) => void,
  environment: NodeJS.ProcessEnv = {},
  arguments_: readonly string[] = [],
) {
  const root = await mkdtemp(resolve(tmpdir(), "a1-pi-ledger-"));
  temporaryRoots.push(root);
  const path = resolve(root, "ledger.json");
  const ledger = await ledgerFixture();
  mutate(ledger);
  await writeFile(path, JSON.stringify(ledger));
  return spawnSync(process.execPath, [checker, ...arguments_], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, A1_PI_SOURCE_LEDGER_PATH: path, ...environment },
  });
}

describe("pinned Pi source ledger governance", () => {
  it("accepts the complete independently verified pinned ledger", () => {
    const result = spawnSync(process.execPath, [checker], { cwd: process.cwd(), encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("109 records, 29 behaviors");
  });

  it("fails when any pinned source unit is removed", async () => {
    const result = await runFixture(ledger => { ledger.records.shift(); });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing pinned source unit");
  });

  it("fails when a required record field is removed", async () => {
    const result = await runFixture(ledger => { delete ledger.records[0].attribution; });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("required field is missing");
    expect(result.stderr).toContain("attribution");
  });

  it.each([
    ["commit", (ledger: Record<string, any>) => { ledger.upstream.commit = "stale"; }, "upstream commit identity is stale"],
    ["package", (ledger: Record<string, any>) => { ledger.upstream.packages[0].version = "0.0.0"; }, "pinned package identity is stale"],
    ["hash", (ledger: Record<string, any>) => { ledger.records[0].sha256 = "0".repeat(64); }, "stale source hash"],
    ["destination", (ledger: Record<string, any>) => { ledger.records[0].localDestination = "src/outside.ts"; }, "escapes the approved adapter roots"],
  ])("rejects stale or invalid %s metadata", async (_name, mutate, diagnostic) => {
    const result = await runFixture(mutate);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it("keeps engine-only compatibility independent from private presentation provenance drift", async () => {
    const mutate = (ledger: Record<string, any>) => {
      const presentation = ledger.records.find((record: Record<string, unknown>) => record.classification === "owned-presentation");
      presentation.sha256 = "0".repeat(64);
    };
    const provenance = await runFixture(mutate);
    expect(provenance.status).toBe(1);
    expect(provenance.stderr).toContain("stale source hash");
    const engineOnly = await runFixture(mutate, {}, ["--engine-only"]);
    expect(engineOnly.status, engineOnly.stderr).toBe(0);
    expect(engineOnly.stdout).toContain("engine-independent ownership OK");
  });

  it("rejects missing linked acceptance tests", async () => {
    const result = await runFixture(ledger => { ledger.records[0].tests = ["test/missing-parity.test.ts"]; });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("linked acceptance test is missing");
  });

  it("rejects unresolved, stale, or classification-incompatible implementation states", async () => {
    const result = await runFixture(ledger => {
      const owned = ledger.records.find((record: Record<string, unknown>) => record.classification === "owned-presentation");
      owned.implementationStatus = "not-ported";
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("implementationStatus is unresolved or incompatible");
  });

  it("rejects a completed owned port remapped away from its real destination", async () => {
    const result = await runFixture(ledger => {
      const owned = ledger.records.find((record: Record<string, unknown>) => record.classification === "owned-presentation");
      owned.localDestination = "src/integrations/pi/components/upstream/components/missing-port.ts";
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("undocumented owned source file");
  });

  it("rejects undocumented deviations", async () => {
    const result = await runFixture(ledger => { ledger.records[0].approvedDeviations.push({ id: "shortcut" }); });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("approvedDeviations[0].reason");
  });

  it("rejects deep Pi imports even when the ledger itself is valid", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-pi-deep-import-"));
    temporaryRoots.push(root);
    await writeFile(resolve(root, "forbidden.ts"), "export { InteractiveMode } from '@earendil-works/pi-coding-agent/dist/modes/index.js';\n");
    const result = await runFixture(() => {}, { A1_PI_SOURCE_SCAN_ROOT: root });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("forbidden deep Pi import");
  });

  it("rejects copied port files that have no ledger destination", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-pi-undocumented-port-"));
    temporaryRoots.push(root);
    await mkdir(resolve(root, "components"), { recursive: true });
    await writeFile(resolve(root, "components", "rogue.ts"), "export {};\n");
    const result = await runFixture(() => {}, { A1_PI_PORT_ROOT: root });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("undocumented owned source file");
  });
});
