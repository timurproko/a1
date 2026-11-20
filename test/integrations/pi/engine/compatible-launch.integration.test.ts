import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPiRuntimeIntegration } from "../../../../src/integrations/pi/engine/index.js";
import { listPiCompatibleModels } from "../../../../src/integrations/pi/engine/cli-discovery.js";
import { RuntimeLaunchError } from "../../../../src/integrations/pi/engine/launch-options.js";

const roots: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))); });

async function fixture() {
  vi.stubEnv("PI_OFFLINE", "1");
  const root = await mkdtemp(resolve(tmpdir(), "a1-compatible-engine-")); roots.push(root);
  const agentDir = resolve(root, "agent"); await mkdir(agentDir);
  const settings = JSON.stringify({ defaultProvider: "fixture", defaultModel: "first", defaultThinkingLevel: "low", defaultProjectTrust: "never" });
  await writeFile(resolve(agentDir, "settings.json"), settings);
  const extension = resolve(root, "fixture.ts");
  await writeFile(extension, `export default function(pi) {
    pi.registerProvider("fixture", { api: "openai-completions", apiKey: "hermetic-no-network", baseUrl: "http://127.0.0.1:1/v1", models: ["first", "second"].map(id => ({ id, name: id, reasoning: true, input: ["text"], contextWindow: 4096, maxTokens: 128, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } })) });
    pi.registerFlag("fixture-effort", { type: "string", description: "fixture effort" });
    pi.registerFlag("fixture-plan", { type: "boolean", description: "fixture plan" });
    pi.registerTool({ name: "fixture_tool", label: "Fixture", description: "fixture", parameters: { type: "object", properties: {} }, async execute() { return { content: [{ type: "text", text: "fixture result" }], details: {} }; } });
    pi.on("session_start", () => pi.appendEntry("fixture-start", { effort: pi.getFlag("fixture-effort"), host: process.env.FM_PI_SESSION_PID }));
  }`);
  return { root, agentDir, extension, settings };
}

describe("real embedded compatibility launch", () => {
  it("bounds expected refusal text and removes terminal controls without losing printable reasons", () => {
    const error = new RuntimeLaunchError("broken.ts: \x1b[2Jbad import\x07\r\n\x1b]8;;https://invalid.example\x07details\x1b]8;;\x07");
    expect(error.message).toBe("broken.ts: bad import\ndetails");
    expect(new RuntimeLaunchError("broken.ts: " + "x".repeat(20_000)).message).toHaveLength(16_384);
    expect(Object.assign(new Error("unexpected"), { name: "RuntimeLaunchError" })).not.toBeInstanceOf(RuntimeLaunchError);
  });
  it("lists extension-provided available models without starting a session or changing parent host authority", async () => {
    const f = await fixture();
    vi.stubEnv("FM_PI_SESSION_PID", "parent-host");
    const models = await listPiCompatibleModels(f.root, f.agentDir, { extensionPaths: [f.extension] }, "fixture/");
    expect(models).toEqual(["fixture/first", "fixture/second"]);
    expect(process.env.FM_PI_SESSION_PID).toBe("parent-host");
    expect(await readFile(resolve(f.agentDir, "settings.json"), "utf8")).toBe(f.settings);
  });

  it("loads explicit resources/flags before startup, excludes built-in and extension tools, and overrides resumed model/effort without saved-default writes", async () => {
    const f = await fixture();
    vi.stubEnv("FM_PI_SESSION_PID", "same-process-host");
    const options = { extensionPaths: [f.extension], extensionFlagValues: [["fixture-effort", "ultra"]] as const, sessionDir: resolve(f.root, "sessions") };
    const first = await createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: options });
    const path = first.session.sessionManager.getSessionFile()!;
    try {
      await first.session.bindExtensions({});
      expect(first.session.sessionManager.getEntries()).toContainEqual(expect.objectContaining({ type: "custom", customType: "fixture-start", data: { effort: "ultra", host: "same-process-host" } }));
      first.session.sessionManager.appendMessage({ role: "user", content: "persisted without a model call", timestamp: 1 });
      expect(first.session.model?.id).toBe("first");
    } finally { await first.dispose(); }
    const resumed = await createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, sessionSelection: { target: path }, runtimeOptions: { ...options, model: "fixture/second:high", thinking: "medium", excludeTools: ["write", "fixture_*"] } });
    try {
      expect(resumed.session.model).toMatchObject({ provider: "fixture", id: "second" });
      expect(resumed.session.thinkingLevel).toBe("medium");
      expect(resumed.session.getActiveToolNames()).toContain("read");
      expect(resumed.session.getActiveToolNames()).not.toContain("write");
      expect(resumed.session.getActiveToolNames()).not.toContain("fixture_tool");
      expect(resumed.session.sessionManager.getSessionFile()).toBe(path);
      expect(process.env.FM_PI_SESSION_PID).toBe("same-process-host");
      expect(await readFile(resolve(f.agentDir, "settings.json"), "utf8")).toBe(f.settings);
    } finally { await resumed.dispose(); }
  });

  it.each([{ model: "fixture/not-a-real-model" }, { extensionFlagValues: [["unregistered-effort", "ultra"]] as const }])("rejects unavailable concrete contracts rather than falling back: %j", async extra => {
    const f = await fixture();
    await expect(createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { extensionPaths: [f.extension], ...extra } })).rejects.toThrow();
  });

  it.each([
    { noSession: true as const },
    { projectTrust: true },
    { provider: "fixture", model: "first", thinking: "high" as const },
  ])("starts with ordinary options despite unnamed project resource failures: %j", async extra => {
    const f = await fixture();
    const directory = resolve(f.root, ".pi/extensions");
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, "broken.ts"), "throw new Error('unnamed extension failed');");
    await writeFile(resolve(directory, "bad-provider.ts"), `export default pi => pi.registerProvider("broken", { models: [{ id: "bad" }] });`);
    const runtime = await createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { extensionPaths: [f.extension], projectTrust: true, ...extra } });
    try {
      expect(runtime.session.model?.provider).toBe("fixture");
      expect(runtime.services.resourceLoader.getExtensions().errors).toContainEqual(expect.objectContaining({ path: resolve(directory, "broken.ts"), error: expect.stringContaining("unnamed extension failed") }));
      expect(runtime.services.diagnostics).toContainEqual(expect.objectContaining({ type: "error", message: expect.stringContaining("bad-provider.ts") }));
    } finally { await runtime.dispose(); }
  });

  it.each([undefined, { noSession: true as const }, { provider: "fixture", model: "first", thinking: "high" as const }])("keeps bare and option-only discovery diagnostics equivalent: %j", async runtimeOptions => {
    const f = await fixture();
    await writeFile(resolve(f.agentDir, "settings.json"), JSON.stringify({ ...JSON.parse(f.settings), defaultProjectTrust: "always", extensions: [f.extension] }));
    const directory = resolve(f.root, ".pi/extensions");
    await mkdir(directory, { recursive: true });
    const broken = resolve(directory, "broken.ts");
    await writeFile(broken, "throw new Error('unnamed extension failed');");
    const runtime = await createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, ...(runtimeOptions === undefined ? {} : { runtimeOptions }) });
    try {
      expect(runtime.session.model?.provider).toBe("fixture");
      expect(runtime.services.resourceLoader.getExtensions().errors).toEqual([{ path: broken, error: "Failed to load extension: unnamed extension failed" }]);
    } finally { await runtime.dispose(); }
  });

  it("keeps catalog discovery nonfatal for unnamed errors and withholds denied project resources", async () => {
    const f = await fixture();
    const directory = resolve(f.root, ".pi/extensions");
    await mkdir(directory, { recursive: true });
    const marker = resolve(f.root, "project-loaded");
    await writeFile(resolve(directory, "broken.ts"), `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "loaded"); throw new Error("unnamed catalog failure");`);
    expect(await listPiCompatibleModels(f.root, f.agentDir, { extensionPaths: [f.extension], projectTrust: true }, "fixture/")).toEqual(["fixture/first", "fixture/second"]);
    await rm(marker);
    const runtime = await createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { extensionPaths: [f.extension], projectTrust: false, noSession: true } });
    try {
      expect(runtime.services.resourceLoader.getExtensions().errors).toEqual([]);
      await expect(readFile(marker)).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await runtime.dispose(); }
  });

  it("refuses failing cached npm package entries without reexecuting factories during validation", async () => {
    const f = await fixture();
    // Fixture layout is pinned to Pi's public temporary-source resolver, with no npm process or network.
    const bucket = createHash("sha256").update("npm-").digest("hex").slice(0, 8);
    const directory = resolve(f.agentDir, "tmp/extensions/npm", bucket, "node_modules/launch-fixture");
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, "package.json"), JSON.stringify({ name: "launch-fixture", version: "1.0.0", pi: { extensions: ["./broken.ts"] } }));
    const entry = resolve(directory, "broken.ts"), marker = resolve(f.root, "factory-count");
    await writeFile(entry, `import { appendFileSync } from "node:fs"; appendFileSync(${JSON.stringify(marker)}, "once"); throw new Error("cached package extension failed");`);
    await expect(createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { extensionPaths: ["npm:launch-fixture@1.0.0"] } }))
      .rejects.toMatchObject({ name: "RuntimeLaunchError", message: expect.stringContaining(`${entry}: Failed to load extension: cached package extension failed`) });
    expect(await readFile(marker, "utf8")).toBe("once");
  });

  it.each(["npm:missing-launch-fixture@1.0.0", "builtin:missing-launch-fixture"])("refuses unavailable explicit source %s with its identity", async source => {
    const f = await fixture();
    await expect(createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { extensionPaths: [f.extension, source] } }))
      .rejects.toMatchObject({ name: "RuntimeLaunchError", message: expect.stringContaining(source) });
  });

  it.each(["file", "directory", "manifest", "missing"])('names a failed explicit %s resource in an expected launch refusal', async kind => {
    const f = await fixture();
    const directory = resolve(f.root, ".pi/extensions/explicit");
    await mkdir(directory, { recursive: true });
    const entry = resolve(directory, "index.ts");
    await writeFile(entry, "throw new Error('explicit resource failed');");
    if (kind === "manifest") await writeFile(resolve(directory, "package.json"), JSON.stringify({ pi: { extensions: ["./index.ts"] } }));
    const requested = kind === "file" ? entry : kind === "missing" ? resolve(f.root, "missing.ts") : directory;
    await expect(createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { projectTrust: true, extensionPaths: [requested] } }))
      .rejects.toMatchObject({ name: "RuntimeLaunchError", message: expect.stringContaining(kind === "file" || kind === "manifest" ? entry : requested) });
  });

  it("refuses a provider registration failure from an explicitly requested extension", async () => {
    const f = await fixture();
    await writeFile(f.extension, `export default pi => pi.registerProvider("broken", { models: [{ id: "bad" }] });`);
    await expect(createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { extensionPaths: [f.extension] } }))
      .rejects.toMatchObject({ name: "RuntimeLaunchError", message: expect.stringContaining(f.extension) });
  });

  it.each([["unregistered-effort", "ultra"], ["fixture-effort", true], ["fixture-plan", "wrong-type"]] as const)("rejects an unusable extension flag --%s with its reason", async (name, value) => {
    const f = await fixture();
    await expect(createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { extensionPaths: [f.extension], extensionFlagValues: [[name, value]] } }))
      .rejects.toMatchObject({ name: "RuntimeLaunchError", message: expect.stringContaining(`--${name}`) });
  });

  it("explains an unregistered flag with the resource that failed to load", async () => {
    const f = await fixture();
    await writeFile(f.extension, "throw new Error('flag extension failed');");
    const launch = listPiCompatibleModels(f.root, f.agentDir, { extensionPaths: [f.extension], extensionFlagValues: [["fixture-effort", "ultra"]] });
    await expect(launch).rejects.toMatchObject({ name: "RuntimeLaunchError", message: expect.stringContaining("Unknown extension flag --fixture-effort; no loaded extension registered it") });
    await expect(launch).rejects.toThrow(`${f.extension}: Failed to load extension: flag extension failed`);
  });

  it("fails an explicit extension import rather than launching a worker without its hooks", async () => {
    const f = await fixture();
    await writeFile(f.extension, "throw new Error('explicit extension failed');");
    await expect(createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { extensionPaths: [f.extension] } })).rejects.toThrow("explicit extension failed");
  });
});
