import { readFile } from "node:fs/promises";
import AjvModule from "ajv/dist/2020.js";
import type { ErrorObject, Options, ValidateFunction } from "ajv";
import { describe, expect, it } from "vitest";

const schemas = "test/physical-host/schemas";
const digest = "a".repeat(64);

const Ajv2020 = ((AjvModule as unknown as { default?: unknown }).default ?? AjvModule) as unknown as new (options?: Options) => { compile(schema: object): ValidateFunction };

async function validators() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const [artifactSchema, verdictSchema] = await Promise.all([
    readFile(`${schemas}/physical-host-artifacts.schema.json`, "utf8").then(JSON.parse),
    readFile(`${schemas}/physical-host-verdict.schema.json`, "utf8").then(JSON.parse),
  ]);
  return { artifacts: ajv.compile(artifactSchema), verdict: ajv.compile(verdictSchema) };
}

describe("independent physical-host evidence schema", () => {
  it("accepts direct and paired transparent evidence without importing product terminal code", async () => {
    const validate = await validators();
    const artifacts = artifactManifest();
    const direct = verdict("direct", [run("direct-run", "direct")], []);
    const transparent = verdict(
      "transparent",
      [run("direct-run", "direct"), run("candidate-run", "candidate")],
      [{
        id: "compare-input",
        dimension: "input-identity",
        directRunId: "direct-run",
        candidateRunId: "candidate-run",
        outcome: "pass",
        artifactIds: ["child-log"],
        explanation: "Independent child observations match.",
      }],
    );

    expect(validate.artifacts(artifacts), JSON.stringify(validate.artifacts.errors)).toBe(true);
    expect(validate.verdict(direct), JSON.stringify(validate.verdict.errors)).toBe(true);
    expect(validate.verdict(transparent), JSON.stringify(validate.verdict.errors)).toBe(true);
  });

  it("rejects evidence produced from a product terminal model or stored outside the scenario root", async () => {
    const validate = await validators();
    const artifacts = artifactManifest();
    artifacts.artifacts[0]!.path = "../reconstructed-frame.json";
    artifacts.artifacts[0]!.independence.productTerminalModelUsed = true;

    expect(validate.artifacts(artifacts)).toBe(false);
    expect(validate.artifacts.errors?.map((error: ErrorObject) => error.instancePath).join(" ")).toMatch(/path|productTerminalModelUsed/);
  });

  it("requires exact candidate identity and failure classification", async () => {
    const validate = await validators();
    const candidate = verdict("transparent", [run("candidate-run", "candidate")], []);
    candidate.artifactIdentity = null;
    candidate.outcome = "fail";
    candidate.failureClassification = null;

    expect(validate.verdict(candidate)).toBe(false);
    expect(validate.verdict.errors?.map((error: ErrorObject) => `${error.instancePath}:${error.keyword}`).join(" ")).toMatch(/artifactIdentity|failureClassification/);
  });
});

function artifactManifest() {
  return {
    schemaVersion: 1,
    scenarioId: "PHYSICAL-001",
    evidenceRoot: "evidence/PHYSICAL-001",
    artifacts: [{
      id: "child-log",
      kind: "child-observation",
      path: "runs/direct/child-observations.jsonl",
      sha256: digest,
      bytes: 42,
      mediaType: "application/x-ndjson",
      capturedAt: "2026-08-13T00:00:01Z",
      runId: "direct-run",
      actionId: "key-c",
      producer: { kind: "child-recorder", name: "addone-generic-child-recorder", version: "1" },
      independence: { source: "child-process", productTerminalModelUsed: false },
    }],
  };
}

function verdict(capability: "direct" | "transparent", runs: ReturnType<typeof run>[], comparisons: object[]) {
  return {
    schemaVersion: 1,
    scenarioId: "PHYSICAL-001",
    requirementIds: ["terminal-physical-oracle"],
    capability,
    platform: { os: "windows", release: "11-24H2", architecture: "x64", hostId: "win11-lab" },
    hostTerminal: {
      name: "Windows Terminal", version: "1.22.0", profile: "AddOne Fixed", font: "Cascadia Mono", fontSize: 12,
      dpiScale: 1, theme: "AddOne Fixed", renderer: "AtlasEngine", columns: 120, rows: 30,
    },
    runtime: { kind: "generic-recorder", name: "addone-generic-child-recorder", version: "1", identity: "sha256:fixture" },
    artifactIdentity: capability === "direct" ? null : {
      packageName: "@timurproko/addone", version: "0.2.0", sourceCommit: "b".repeat(40),
      sha512Integrity: `sha512-${Buffer.from("candidate").toString("base64")}`, releaseId: "0.2.0-candidate",
    },
    profile: {
      executable: "node", arguments: ["recorder.mjs"], cwd: "fixture", environment: { TERM: "xterm-256color" },
      terminalIdentity: "xterm-256color", columns: 120, rows: 30,
    },
    runs,
    comparisons,
    outcome: "pass" as "pass" | "fail",
    failureClassification: null as null | string,
    firstDivergence: null,
    artifactManifest: "artifact-manifest.json",
    notes: ["Schema fixture only; not certification evidence."],
    startedAt: "2026-08-13T00:00:00Z",
    completedAt: "2026-08-13T00:00:02Z",
  };
}

function run(id: string, role: "direct" | "candidate") {
  return {
    id,
    role,
    startedAt: "2026-08-13T00:00:00Z",
    completedAt: "2026-08-13T00:00:02Z",
    processIdentity: {
      pid: 1234, startIdentity: "1234:fixture", parentPid: 1200, foregroundOwner: true,
      standardInputIdentity: "console-in", standardOutputIdentity: "console-out", standardErrorIdentity: "console-out",
    },
    actions: [{ id: "key-c", sequence: 0, kind: "key-down", dispatchedAtNs: 100, parameters: { key: "c", control: true }, artifactIds: ["child-log"] }],
    observations: [{ id: `${id}-child-c`, kind: "child-effect", observedAtNs: 150, actionId: "key-c", artifactIds: ["child-log"], summary: "Child observed the control action." }],
    timingSamples: [{ actionId: "key-c", metric: "action-to-child", nanoseconds: 50, artifactIds: ["child-log"] }],
    restoration: {
      usable: true, inputModeRestored: true, cursorRestored: true, screenRestored: true,
      selectionUsable: true, lineEditingUsable: true, artifactIds: ["child-log"],
    },
    artifactIds: ["child-log"],
  };
}
