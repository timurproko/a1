import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runBootstrap } from "../../../src/foundation/release/bootstrap.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
const state = vi.hoisted(() => ({ release: undefined as any, warm: true }));
vi.mock("../../../src/foundation/release/release-state.js", () => ({ ReleaseStateStore: class {
  async read() { return { references: { active: state.warm ? "fixture" : null }, releases: { fixture: { ...state.release, approval: "approved" } } }; }
  async recordCandidate() {} async activateForLaunch() { state.warm = true; return await this.read(); }
} }));
vi.mock("../../../src/foundation/release/update-transaction.js", () => ({ UpdateTransactionStore: class { async read() { return null; } } }));
vi.mock("../../../src/foundation/release/restart-certification.js", () => ({ readRestartCertifiedRelease: async () => state.release }));
vi.mock("../../../src/foundation/release/release-use.js", () => ({ acquireReleaseUse: async () => ({ started: async () => {}, release: async () => {} }) }));
vi.mock("../../../src/foundation/release/release-store.js", async original => ({ ...await original<object>(), assertCertifiedFilesPresent: async () => {}, materializeRelease: async () => state.release, resolveReleaseEntryPoint: async () => join(state.release.releaseRoot, "bin", "ui.js") }));
let root = "";
afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); state.warm = true; });
async function fixture(supported: boolean) {
  root = await mkdtemp(join(tmpdir(), "bootstrap-argv-"));
  await mkdir(join(root, "bin"));
  await writeFile(join(root, "package.json"), JSON.stringify({ version: "1.0.0" }));
  await writeFile(join(root, "bin", "ui.js"), `require('node:fs').writeFileSync(${JSON.stringify(join(root, "argv.json"))}, JSON.stringify(process.argv.slice(2)));`);
  state.release = { releaseId: "fixture", packageVersion: "1.0.0", releaseRoot: root, contentDigest: "a".repeat(64), launchContract: "neutral-launch-v1", files: supported ? [{ path: "dist/features/launch/interactive-arguments.js" }] : [] };
  return { packageRoot: root, environment: { ...process.env, [PRODUCT_IDENTITY.environment.dataDir]: join(root, "data"), [PRODUCT_IDENTITY.environment.runtimeDir]: join(root, "runtime") }, scheduleMaintenance: async () => {} };
}
describe("bootstrap child startup payload", () => {
  it.each([true, false])("keeps literal invocation options through warm=%s selection", async warm => {
    const options = await fixture(true); state.warm = warm;
    expect(await runBootstrap({ ...options, launchIntent: { kind: "interactive", profileId: "a1", sessionColor: "green", promptArguments: ["--session-color", "pink", "$(literal)"] } })).toBe(0);
    expect(JSON.parse(await readFile(join(root, "argv.json"), "utf8"))).toEqual(["--session-color", "green", "--", "--session-color", "pink", "$(literal)"]);
  });
  it("rejects an incompatible selected UI before spawn but preserves ordinary fallback", async () => {
    const options = await fixture(false);
    await expect(runBootstrap({ ...options, launchIntent: { kind: "interactive", profileId: "a1", sessionColor: "green" } })).rejects.toThrow("does not support");
    await expect(readFile(join(root, "argv.json"))).rejects.toThrow();
    expect(await runBootstrap(options)).toBe(0);
    expect(JSON.parse(await readFile(join(root, "argv.json"), "utf8"))).toEqual([]);
  });
});
