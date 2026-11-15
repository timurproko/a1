import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { collectPublishedPairDiagnostics, diagnosePublishedPair } from "../../scripts/release/diagnose-published-pair.mjs";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-pair-diagnostic-"));
  roots.push(root);
  return root;
}

describe("read-only published-pair diagnosis", () => {
  it("isolates diagnostic dispatch from ordinary validation and npm write authority", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    expect(workflow.on.workflow_dispatch.inputs.published_pair_version.default).toBe("");
    expect(workflow.jobs.readiness.if).toContain("!inputs.published_pair_version");
    const job = workflow.jobs["published-pair-diagnostic"];
    expect(job.if).toBe("github.event_name == 'workflow_dispatch' && inputs.published_pair_version != ''");
    expect(job["runs-on"]).toBe("windows-2025");
    expect(job.strategy).toEqual({ "fail-fast": false, matrix: { observer: ["none", "events", "stderr"] } });
    expect(job.steps[1].with["registry-url"]).toBe("https://registry.npmjs.org");
    expect(job.steps[3].env.PUBLISHED_PAIR_OBSERVER_MODE).toBe("${{ matrix.observer }}");
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(job.environment).toBeUndefined();
    const commands = job.steps.filter((step: { run?: string }) => step.run).map((step: { run: string }) => step.run);
    expect(commands).toEqual(["npm ci --ignore-scripts --no-audit --no-fund", "node scripts/release/diagnose-published-pair.mjs"]);
    const upload = job.steps.at(-1);
    expect(upload.if).toBe("always()");
    expect(upload.with.path).toBe(".artifacts/validation/published-pair-diagnostic/*.json");
    expect(JSON.stringify(job)).not.toMatch(/id-token|npm-publish|secrets\./u);
  });

  it("rejects an invalid version before acquiring or executing registry bytes", async () => {
    await expect(diagnosePublishedPair({ PUBLISHED_PAIR_DIAGNOSTIC_VERSION: "latest; forged" })).rejects.toThrow("invalid published-pair diagnostic version");
  });

  it.each(["events", "stderr"])("captures worker errors and exits without modifying package bytes (mode: %s)", async mode => {
    const root = await fixture();
    const worker = resolve(root, "recovery.js");
    const source = "console.error('worker error: fixture-secret-token'); throw new Error('original worker exception: fixture-secret-token');\n";
    await writeFile(worker, source);
    const observer = pathToFileURL(resolve("scripts/release/published-pair-observer.mjs")).href;
    const result = spawnSync(process.execPath, ["-e", `
      const { spawn } = require('node:child_process');
      const child = spawn(process.execPath, [${JSON.stringify(worker)}, '--worker'], { detached: true, windowsHide: true, stdio: 'ignore' });
      child.on('close', () => {});
    `], {
      env: { ...process.env, NODE_OPTIONS: `--import=${observer}`, PUBLISHED_PAIR_OBSERVER_DIR: root, PUBLISHED_PAIR_OBSERVER_MODE: mode },
      windowsHide: true, encoding: "utf8", timeout: 10_000,
    });
    expect(result.status, result.stderr).toBe(0);
    expect(createHash("sha256").update(await readFile(worker)).digest("hex")).toBe(createHash("sha256").update(source).digest("hex"));
    const records = await collectPublishedPairDiagnostics(root, { NODE_AUTH_TOKEN: "fixture-secret-token" });
    const text = JSON.stringify(records);
    expect(Object.keys(records).some(name => name.startsWith("worker-stderr-"))).toBe(mode === "stderr");
    expect(text).toContain("original worker exception");
    expect(text).toContain("worker-exit");
    expect(text).toContain("uncaught");
    expect(text).toContain("[redacted]");
    expect(text).not.toContain("fixture-secret-token");
    const events = Object.entries(records).filter(([name]) => name.endsWith(".jsonl")).flatMap(([, text]) => text.split("\n").map(line => JSON.parse(line)));
    expect(events).toContainEqual(expect.objectContaining({ event: "worker-exit", code: 1 }));
  });

  it("bounds diagnostic tails and excludes unrelated paths and directories", async () => {
    const root = await fixture();
    await mkdir(resolve(root, "99.jsonl"));
    await writeFile(resolve(root, "unrelated-secret.txt"), "must not read");
    await writeFile(resolve(root, "12.jsonl"), `${"x".repeat(50_000)}\nhttps://user:password@example.com/?token=hidden\ncredential-123456\n`);
    const evidence = await collectPublishedPairDiagnostics(root, { NODE_AUTH_TOKEN: "credential-123456" });
    expect(Object.keys(evidence)).toEqual(["12.jsonl"]);
    expect(evidence["12.jsonl"]!.length).toBeLessThanOrEqual(16_000);
    expect(JSON.stringify(evidence)).not.toMatch(/user:password|token=hidden|credential-123456/u);
    await expect(collectPublishedPairDiagnostics(resolve(root, "missing"))).resolves.toEqual({});
  });
});
