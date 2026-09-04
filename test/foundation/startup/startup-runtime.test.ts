import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertStartupPerformanceBudget,
  collectCompileCaches,
  enableStartupCompileCache,
  initializeStartupTrace,
  markStartupPhase,
  parseStartupTrace,
  startupCompileCachePath,
} from "../../../src/foundation/startup/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("opt-in startup evidence and compile cache", () => {
  it("records monotonic redacted phases only when explicitly enabled", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-startup-trace-"));
    roots.push(root);
    const path = resolve(root, "trace.jsonl");
    const environment: NodeJS.ProcessEnv = {
      [PRODUCT_IDENTITY.environment.startupTrace]: path,
      [PRODUCT_IDENTITY.environment.releaseId]: "1.0.0-aaaaaaaaaaaaaaaaaaaa",
      [PRODUCT_IDENTITY.environment.releaseLayers]: "dependencies-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      SECRET_TOKEN: "must-not-appear",
      PROMPT: "private prompt",
    };
    initializeStartupTrace(environment, "pi");
    await markStartupPhase(environment, "command-invoked");
    await markStartupPhase(environment, "bootstrap-start");
    await markStartupPhase(environment, "durable-validation-start");
    await markStartupPhase(environment, "durable-validation-complete");
    await markStartupPhase(environment, "replacement-supervisor-start");
    await markStartupPhase(environment, "replacement-supervisor-ready");
    await markStartupPhase(environment, "first-input-ready-render");

    const source = await readFile(path, "utf8");
    const events = parseStartupTrace(source);
    expect(events.map(event => event.phase)).toEqual([
      "command-invoked", "bootstrap-start", "durable-validation-start", "durable-validation-complete",
      "replacement-supervisor-start", "replacement-supervisor-ready", "first-input-ready-render",
    ]);
    expect(events.map(event => event.elapsedMs)).toEqual([...events.map(event => event.elapsedMs)].sort((left, right) => left - right));
    expect(Object.keys(events[0]!).sort()).toEqual([
      "dependencyLayerIds", "elapsedMs", "fileReadOperations", "nodeVersion", "phase", "processId", "profileId", "releaseId", "schema", "traceId",
    ].sort());
    expect(source).not.toContain("must-not-appear");
    expect(source).not.toContain("private prompt");
  });

  it("performs no trace I/O for an ordinary launch", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-startup-silent-"));
    roots.push(root);
    const environment: NodeJS.ProcessEnv = {};
    initializeStartupTrace(environment, "a1");
    await markStartupPhase(environment, "command-invoked");
    expect(environment[PRODUCT_IDENTITY.environment.startupTrace]).toBeUndefined();
    await expect(readFile(resolve(root, "trace.jsonl"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails a regressed Windows budget with dominant phases", () => {
    const event = (phase: "command-invoked" | "ui-modules-loaded" | "first-input-ready-render", elapsedMs: number) => ({
      schema: PRODUCT_IDENTITY.evidence.startupTraceSchema,
      traceId: "trace",
      phase,
      elapsedMs,
      processId: 1,
      profileId: "a1",
      releaseId: "1.0.0-aaaaaaaaaaaaaaaaaaaa",
      dependencyLayerIds: [],
      nodeVersion: process.version,
      fileReadOperations: 0,
    });
    expect(() => assertStartupPerformanceBudget({
      profileId: "a1",
      launchKind: "post-update",
      events: [event("command-invoked", 0), event("ui-modules-loaded", 5_500), event("first-input-ready-render", 6_000)],
    })).toThrow(/ui-modules-loaded 5500ms/);
    expect(() => assertStartupPerformanceBudget({
      profileId: "a1",
      launchKind: "no-live-supervisor",
      events: [event("command-invoked", 0), event("ui-modules-loaded", 5_500), event("first-input-ready-render", 6_000)],
    })).toThrow(/no-live-supervisor/);
  });

  it("falls back without behavior changes when cache storage is unavailable", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-compile-unavailable-"));
    roots.push(root);
    const file = resolve(root, "not-a-directory");
    await writeFile(file, "blocked");
    expect(enableStartupCompileCache(file, "1.0.0-aaaaaaaaaaaaaaaaaaaa", [])).toBeNull();
  });

  it("names compile caches by Node and immutable identities and bounds stale namespaces", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-compile-cache-"));
    roots.push(root);
    const active = startupCompileCachePath(root, "1.0.0-aaaaaaaaaaaaaaaaaaaa", ["dependencies-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]);
    const sameLayerNewRelease = startupCompileCachePath(root, "1.0.1-dddddddddddddddddddd", ["dependencies-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]);
    const stale = startupCompileCachePath(root, "0.9.0-cccccccccccccccccccc", []);
    const other = resolve(root, "cache", "compile", "old-node-cache");
    await mkdir(active, { recursive: true });
    await mkdir(stale, { recursive: true });
    await mkdir(other, { recursive: true });
    await writeFile(resolve(active, "entry"), "active");

    expect(sameLayerNewRelease).toBe(active);
    expect(active).not.toBe(stale);
    await collectCompileCaches(root, [active], 0);
    await expect(readFile(resolve(active, "entry"), "utf8")).resolves.toBe("active");
    await expect(lstat(stale)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(other)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
