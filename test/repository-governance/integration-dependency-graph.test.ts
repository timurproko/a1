import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { compareIntegrationDependencies, createIntegrationDependencyGraph, type IntegrationDependencyPolicy } from "../../scripts/release/integration-dependency-graph.mjs";
import type { RevisionDependencySnapshot } from "../../scripts/release/revision-dependencies.mjs";

const baseId = "a".repeat(40), headId = "b".repeat(40);
const digest = (source: string) => createHash("sha256").update(source).digest("hex");
function policy(): IntegrationDependencyPolicy {
  return { schema: "a1-integration-dependencies-v1", emittedRoot: "dist", sourceRoot: "src",
    invalidators: ["package.json", "package-lock.json", "config/", "native/", ".github/workflows/", "scripts/release/", "tsconfig.json"], unrelated: ["scripts/governance/"], generated: [], reviewed: [] };
}
function snapshot(sources: Record<string, string>, revision = baseId): RevisionDependencySnapshot {
  return { revision, files: new Map(Object.entries({ "package.json": "{}", "package-lock.json": "{}", ...sources }).map(([path, source]) =>
    [path, { source, mode: "100644", oid: "c".repeat(40), size: Buffer.byteLength(source) }])) };
}
function trace(sources: Record<string, string>, root = "src/root.ts", rules = policy()) {
  return createIntegrationDependencyGraph(snapshot(sources), rules).trace([root]);
}

describe("integration dependency graph", () => {
  it("resolves transitive cycles once and memoizes parsing across owners", () => {
    const graph = createIntegrationDependencyGraph(snapshot({
      "src/root.ts": "export * from './leaf.js';", "src/leaf.ts": "import './root.js';",
    }), policy());
    expect([...graph.trace(["src/root.ts"]).reachable.keys()]).toEqual(["src/root.ts", "src/leaf.ts"]);
    expect(graph.trace(["src/leaf.ts"]).issues).toEqual([]);
    expect(graph.stats.parsedModules).toBe(2);
  });

  it.each([
    "import './leaf.js';", "export { value } from './leaf.js';", "export type { Value } from './leaf.js';",
    "void import('./leaf.js');", "require('./leaf.js');", "require.resolve('./leaf.js');", "import.meta.resolve('./leaf.js');",
    "import leaf = require('./leaf.js');", "type Leaf = typeof import('./leaf.js');",
    "import { createRequire as factory } from 'node:module'; const load = factory(import.meta.url); load('./leaf.js');",
  ])("retains literal dependency syntax: %s", source => {
    const result = trace({ "src/root.ts": source, "src/leaf.ts": "export const value = 1;" });
    expect(result.reachable.has("src/leaf.ts")).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it.each([[".mjs", ".mts"], [".cjs", ".cts"], ["", "/index.ts"]])("resolves %s to %s", (runtime, source) => {
    const result = trace({ "src/root.ts": `import './leaf${runtime}';`, [`src/leaf${source}`]: "export {};" });
    expect(result.reachable.has(`src/leaf${source}`)).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("maps emitted input to source without reading dist or node_modules", () => {
    const result = trace({ "bin/cli.js": "import '../dist/runtime/entry.js';", "src/runtime/entry.ts": "export {};" }, "bin/cli.js");
    expect([...result.reachable.keys()]).toEqual(["bin/cli.js", "src/runtime/entry.ts"]);
    expect(result.issues).toEqual([]);
  });

  it("unions package-import and self-export conditions and binds external package resolution", () => {
    const result = trace({
      "package.json": JSON.stringify({ name: "@fixture/app", imports: { "#runtime": { import: "./dist/runtime.ts", require: "./dist/alternate.cjs" } },
        exports: { "./client": "./dist/client.js" }, dependencies: { "fixture-external": "1.0.0" } }),
      "src/root.ts": "import '#runtime'; import '@fixture/app/client'; import 'fixture-external/subpath'; import 'node:fs';",
      "src/runtime.ts": "export {};", "src/alternate.cts": "export {};", "src/client.ts": "export {};",
    });
    expect([...result.reachable.keys()]).toEqual(expect.arrayContaining(["package.json", "package-lock.json", "src/runtime.ts", "src/alternate.cts", "src/client.ts"]));
    expect(result.issues).toEqual([]);
  });

  it.each([
    "new URL('./codec.wasm', import.meta.url);",
    "import { readFile as readBytes } from 'node:fs/promises'; readBytes(new URL('./codec.wasm', import.meta.url));",
    "import { Worker as Task } from 'node:worker_threads'; new Task(new URL('./codec.wasm', import.meta.url));",
    "import * as cp from 'node:child_process'; cp.fork(new URL('./codec.wasm', import.meta.url));",
  ])("retains literal module-relative assets/process inputs: %s", source => {
    const result = trace({ "src/root.ts": source, "src/codec.wasm": "opaque payload" });
    expect(result.reachable.has("src/codec.wasm")).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it.each([
    ["import(variable);", "computed-import"],
    ["require(variable);", "computed-import"],
    ["new Worker(entry);", "worker"],
    ["spawn(process.execPath, args);", "subprocess"],
    ["import { spawn as run } from 'node:child_process'; run(command);", "subprocess"],
    ["import cp from 'cross-spawn'; cp.sync(command);", "subprocess"],
    ["readFile(path);", "asset-read"],
    ["import { readFile as load } from 'node:fs/promises'; load(path);", "asset-read"],
    ["const run = spawn; run(command);", "opaque-loader"],
    ["const run = spawn.bind(null, command); run();", "opaque-loader"],
    ["import * as cp from 'node:child_process'; cp[method](command);", "opaque-loader"],
    ["import fs from 'node:fs'; fs.promises[method](path);", "opaque-loader"],
    ["const { spawn: run } = require('node:child_process'); run(command);", "subprocess"],
    ["import { createRequire } from 'node:module'; const factory = createRequire; factory(import.meta.url)(path);", "opaque-loader"],
    ["consume(require);", "opaque-loader"],
    ["import { createRequire } from 'node:module'; const load = createRequire('/different/root.js'); load('./leaf.js');", "opaque-loader"],
    ["import { createRequire } from 'node:module'; createRequire(import.meta.url)('./leaf.js');", "opaque-loader"],
    ["import { registerHooks as setup } from 'node:module'; setup(hooks);", "opaque-loader"],
    ["process.dlopen(module, path);", "opaque-loader"],
    ["process.getBuiltinModule(name);", "opaque-loader"],
    ["new Function(source);", "opaque-loader"],
    ["eval(source);", "opaque-loader"],
    ["import '#unknown';", "unresolved-package-import"],
    ["import 'undeclared';", "unresolved-bare-import"],
    ["import './missing.js';", "unresolved-repository-import"],
    ["export const = ;", "unsupported-syntax"],
  ])("does not silently ignore unsupported input: %s", (source, code) => {
    expect(trace({ "src/root.ts": source }).issues).toContainEqual({ code, path: "src/root.ts" });
  });

  it("uses source-bound reviews without letting stale reviews conceal changed load paths", () => {
    const source = "spawn(command, args); import(variable); new Worker(entry);";
    const rules = policy();
    rules.reviewed.push({ path: "src/root.ts", sha256: digest(source), edges: ["src/worker.ts"], handles: ["subprocess", "computed-import", "worker"], reason: "fixture review" });
    const sources = { "src/root.ts": source, "src/worker.ts": "export {};" };
    expect(trace(sources, "src/root.ts", rules).issues).toEqual([]);
    expect(trace(sources, "src/root.ts", rules).reachable.has("src/worker.ts")).toBe(true);
    expect(trace({ ...sources, "src/root.ts": `${source}\n// changed` }, "src/root.ts", rules).issues).toContainEqual({ code: "reviewed-edge-stale", path: "src/root.ts" });
    expect(trace({ "src/root.ts": source }, "src/root.ts", rules).issues).toContainEqual({ code: "unresolved-repository-import", path: "src/root.ts" });
  });

  it("follows generated native and inventory inputs including non-script assets", () => {
    const rules = policy();
    rules.generated.push({ output: "dist/native/", inputs: ["native/guardian/", "scripts/build.mjs"] });
    const result = trace({ "src/root.ts": "new URL('../dist/native/win32-x64/guardian.exe', import.meta.url);",
      "native/guardian/Cargo.toml": "manifest", "native/guardian/Cargo.lock": "lock", "native/guardian/src/main.rs": "fn main() {}", "scripts/build.mjs": "export {};" }, "src/root.ts", rules);
    expect(result.issues).toEqual([]);
    expect([...result.reachable.keys()]).toEqual(expect.arrayContaining(["native/guardian/Cargo.toml", "native/guardian/Cargo.lock", "native/guardian/src/main.rs", "scripts/build.mjs"]));
  });

  it.each([
    ["package.json", "{invalid", "invalid-package-manifest"],
    ["package.json", '{"workspaces":["packages/*"]}', "unsupported-workspaces"],
    ["tsconfig.json", '{"compilerOptions":{"paths":{"alias":["src/foo"]}}}', "unsupported-module-resolution"],
    ["tsconfig.json", '{"extends":"external-config"}', "unsupported-module-resolution"],
    ["tsconfig.json", "{invalid", "invalid-module-resolution"],
  ])("retains uncertainty for %s: %s", (path, source, code) => {
    expect(trace({ "src/root.ts": "export {};", [path]: source }).issues).toContainEqual({ code, path });
  });

  it("rejects missing sources, symlinks and nested package-resolution assumptions", () => {
    const sources = snapshot({ "src/root.ts": "import './link.js';", "src/link.ts": "../elsewhere", "src/package.json": "{}" });
    sources.files.get("src/link.ts")!.mode = "120000";
    const result = createIntegrationDependencyGraph(sources, policy()).trace(["src/root.ts"]);
    expect(result.issues).toContainEqual({ code: "unsupported-tree-entry", path: "src/link.ts" });
    expect(result.issues).toContainEqual({ code: "nested-package-resolution", path: "src/root.ts" });
    delete sources.files.get("src/root.ts")!.source;
    expect(createIntegrationDependencyGraph(sources, policy()).trace(["src/root.ts"]).issues).toContainEqual({ code: "missing-module-source", path: "src/root.ts" });
  });

  it("bounds work and never reuses a partial parse as successful evidence", () => {
    const sources = snapshot({ "src/root.ts": "import './leaf.js';", "src/leaf.ts": "export {};" });
    const graph = createIntegrationDependencyGraph(sources, policy(), { limits: { nodes: 1 } });
    expect(graph.trace(["src/root.ts"]).issues.length).toBeGreaterThan(0);
    expect(graph.trace(["src/root.ts"]).issues.length).toBeGreaterThan(0);
    let reads = 0;
    Object.defineProperty(sources.files.get("src/root.ts"), "source", { get() { if (++reads > 1) throw new Error("private fault"); return "export {};"; } });
    const faulty = createIntegrationDependencyGraph(sources, policy());
    expect(faulty.trace(["src/root.ts"]).issues.length).toBeGreaterThan(0);
    expect(faulty.trace(["src/root.ts"]).issues).toContainEqual({ code: "dependency-module-incomplete", path: "src/root.ts" });
  });

  it("does not retain raw import expressions or diagnostic payloads", () => {
    const result = trace({ "src/root.ts": "import('https://host/?token=private-value');" });
    expect(result.issues.length).toBeGreaterThan(0);
    expect(JSON.stringify(result.issues)).not.toMatch(/private-value|token|https/);
  });
});

describe("base/head integration reachability", () => {
  const owners = [{ id: "runtime", entries: ["src/root.ts"] }, { id: "other", entries: ["src/other.ts"] }];
  const before = { "src/root.ts": "export * from './old.js';", "src/old.ts": "export {};", "src/other.ts": "export {};" };

  it.each([
    { status: "D", path: "src/old.ts" },
    { status: "R", oldPath: "src/old.ts", path: "src/renamed.ts" },
    { status: "C", oldPath: "src/old.ts", path: "src/copied.ts" },
  ])("preserves base reachability for $status", change => {
    const result = compareIntegrationDependencies({ base: snapshot(before), head: snapshot({ "src/root.ts": "export {};", "src/other.ts": "export {};" }, headId),
      changes: [change], owners, basePolicy: policy() });
    expect(result.owners.map(owner => owner.selected)).toEqual([true, false]);
    expect(result.owners[0]!.matches).toContainEqual(expect.objectContaining({ path: "src/old.ts", revision: baseId, chain: ["src/root.ts", "src/old.ts"] }));
  });

  it("selects a newly reachable head dependency and keeps unrelated owners unselected", () => {
    const result = compareIntegrationDependencies({ base: snapshot(before), head: snapshot({ ...before, "src/root.ts": "import './new.js';", "src/new.ts": "export {};" }, headId),
      changes: [{ status: "A", path: "src/new.ts" }], owners, basePolicy: policy() });
    expect(result.owners.map(owner => owner.selected)).toEqual([true, false]);
    expect(result.owners[0]!.matches[0]!.revision).toBe(headId);
  });

  it.each(["native/guardian/src/main.rs", "package-lock.json", "config/validation-suites.json", ".github/workflows/ci.yml", "scripts/release/new-policy.mjs"])("selects all owners for invalidator %s", path => {
    const result = compareIntegrationDependencies({ base: snapshot(before), head: snapshot(before, headId), changes: [{ status: "M", path }], owners, basePolicy: policy() });
    expect(result.owners.every(owner => owner.selected && owner.invalidators.includes(path))).toBe(true);
  });

  it("does not treat self-comparison or unresolved graphs as empty success", () => {
    const value = snapshot(before);
    expect(compareIntegrationDependencies({ base: value, head: value, changes: [], owners, basePolicy: policy() }).owners.every(owner => owner.selected)).toBe(true);
    const result = compareIntegrationDependencies({ base: value, head: snapshot({ ...before, "src/root.ts": "import(variable);" }, headId),
      changes: [{ status: "M", path: "scripts/unrelated.mjs" }], owners, basePolicy: policy() });
    expect(result.owners.map(owner => owner.selected)).toEqual([true, false]);
  });
});
