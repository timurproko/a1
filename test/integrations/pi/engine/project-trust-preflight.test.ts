import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectTrustStore, SettingsManager } from "@earendil-works/pi-coding-agent";
import {
  createPiRuntimeServicesAfterTrust,
  PiSettingsBridge,
  resolvePiProjectTrustPreflight,
} from "../../../../src/integrations/pi/engine/index.js";

let root: string;
let agentDir: string;
let cwd: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "a1-project-trust-"));
  agentDir = join(root, "agent");
  cwd = join(root, "project", "child");
  mkdirSync(agentDir, { recursive: true });
  mkdirSync(join(cwd, ".pi"), { recursive: true });
  writeFileSync(join(cwd, ".pi", "settings.json"), "{}\n");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function options(extra: Partial<Parameters<typeof resolvePiProjectTrustPreflight>[0]> = {}) {
  return { cwd, agentDir, ...extra };
}

describe("project trust preflight", () => {
  it("asks for an uncovered directory even when it has no project-scoped source", async () => {
    rmSync(join(cwd, ".pi"), { recursive: true, force: true });
    const prompt = vi.fn(async () => true);
    await expect(resolvePiProjectTrustPreflight(options({ prompt })))
      .resolves.toEqual({ trusted: true, source: "interactive", diagnostic: null });
    expect(prompt).toHaveBeenCalledWith({ cwd, defaultDecision: "ask" });
    expect(new ProjectTrustStore(agentDir).get(cwd)).toBe(true);
  });

  it("uses the nearest saved path decision before the global default", async () => {
    writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ defaultProjectTrust: "always" }));
    const store = new ProjectTrustStore(agentDir);
    store.set(join(root, "project"), true);
    expect(await resolvePiProjectTrustPreflight(options())).toMatchObject({ trusted: true, source: "saved" });
    store.set(cwd, false);
    expect(await resolvePiProjectTrustPreflight(options())).toMatchObject({ trusted: false, source: "saved" });
  });

  it("does not let an exact decision cover an unrelated sibling", async () => {
    const store = new ProjectTrustStore(agentDir);
    store.set(cwd, true);
    const sibling = join(root, "project", "sibling");
    mkdirSync(sibling, { recursive: true });
    const prompt = vi.fn(async () => false);
    await expect(resolvePiProjectTrustPreflight({ cwd: sibling, agentDir, prompt }))
      .resolves.toEqual({ trusted: false, source: "interactive", diagnostic: null });
    expect(prompt).toHaveBeenCalledOnce();
    expect(store.get(cwd)).toBe(true);
    expect(store.get(sibling)).toBe(false);
  });

  it("honors always and never defaults for an undecided path", async () => {
    writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ defaultProjectTrust: "always" }));
    expect(await resolvePiProjectTrustPreflight(options())).toMatchObject({ trusted: true, source: "default" });
    writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ defaultProjectTrust: "never" }));
    expect(await resolvePiProjectTrustPreflight(options())).toMatchObject({ trusted: false, source: "default" });
  });

  it("applies a changed default to the next undecided startup", async () => {
    const settings = SettingsManager.create(cwd, agentDir, { projectTrusted: false });
    const port = new PiSettingsBridge(settings);
    port.bindOwner("startup", { defaultProjectTrust: { apply() {} } });
    await expect(port.writeSetting("defaultProjectTrust", "always")).resolves.toMatchObject({
      status: "deferred", application: "next-start", storedValue: "always", effectiveValue: "ask",
    });
    await expect(resolvePiProjectTrustPreflight(options())).resolves.toMatchObject({ trusted: true, source: "default" });
  });

  it("persists explicit accept and reject decisions before activation", async () => {
    const accepted = await resolvePiProjectTrustPreflight(options({ prompt: async () => true }));
    expect(accepted).toEqual({ trusted: true, source: "interactive", diagnostic: null });
    expect(new ProjectTrustStore(agentDir).get(cwd)).toBe(true);

    new ProjectTrustStore(agentDir).set(cwd, null);
    const rejected = await resolvePiProjectTrustPreflight(options({ prompt: async () => false }));
    expect(rejected).toEqual({ trusted: false, source: "interactive", diagnostic: null });
    expect(new ProjectTrustStore(agentDir).get(cwd)).toBe(false);
  });

  it("fails closed for cancel, error, and unavailable interaction", async () => {
    for (const prompt of [async () => null, async () => { throw new Error("terminal failed"); }]) {
      new ProjectTrustStore(agentDir).set(cwd, null);
      const result = await resolvePiProjectTrustPreflight(options({ prompt }));
      expect(result.trusted).toBe(false);
      expect(result.source).toBe("fail-closed");
      expect(result.diagnostic).toMatch(/withheld/);
    }
    const unavailable = await resolvePiProjectTrustPreflight(options());
    expect(unavailable).toMatchObject({ trusted: false, source: "fail-closed" });
    expect(unavailable.diagnostic).toMatch(/requires interaction/);
  });

  it("propagates an explicit startup exit without creating a trust decision", async () => {
    const exit = Object.assign(new Error("Project trust prompt exited"), {
      name: "ProjectTrustPromptExitError",
      exitCode: 0,
    });
    await expect(resolvePiProjectTrustPreflight(options({
      prompt: async () => { throw exit; },
    }))).rejects.toBe(exit);
    expect(new ProjectTrustStore(agentDir).get(cwd)).toBeNull();
  });

  it("uses an in-session saved decision only on the next launch", async () => {
    writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ defaultProjectTrust: "always" }));
    const current = await resolvePiProjectTrustPreflight(options());
    expect(current.trusted).toBe(true);
    new ProjectTrustStore(agentDir).set(cwd, false);
    // Security: the already returned activation authority cannot be rewritten retroactively.
    expect(current.trusted).toBe(true);
    expect(await resolvePiProjectTrustPreflight(options())).toMatchObject({ trusted: false, source: "saved" });
  });

  it("resolves trust before constructing project settings or resource services", async () => {
    const order: string[] = [];
    const fakeSettings = {};
    const fakeServices = { marker: "services" };
    const result = await createPiRuntimeServicesAfterTrust({
      cwd,
      agentDir,
      preflightDependencies: {
        async resolveTrust() {
          order.push("trust");
          return { trusted: false, source: "fail-closed", diagnostic: "withheld" };
        },
        createSettingsManager(_cwd, _agentDir, projectTrusted) {
          order.push(`settings:${String(projectTrusted)}`);
          return fakeSettings as never;
        },
        async createServices(input) {
          order.push("resources");
          expect(input.settingsManager).toBe(fakeSettings);
          return fakeServices as never;
        },
      },
    });
    expect(order).toEqual(["trust", "settings:false", "resources"]);
    expect(result.services).toBe(fakeServices);
  });
});
