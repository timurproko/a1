import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repository = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

describe("mutable bootstrap boundary", () => {
  it("keeps the supervisor internal while publishing only the a1 executable", async () => {
    const manifest = JSON.parse(await readFile(resolve(repository, "package.json"), "utf8")) as { bin?: unknown };
    expect(manifest.bin).toEqual({ "a1": "bin/cli.js" });
    await expect(readFile(resolve(repository, "bin/supervisor.js"), "utf8")).resolves.toContain("runSupervisor");
  });

  it("routes interactive launch through bootstrap and starts the owned runtime lazily", async () => {
    const [bin, guardian, ui] = await Promise.all([
      readFile(resolve(repository, "bin/cli.js"), "utf8"),
      readFile(resolve(repository, "bin/guardian.js"), "utf8"),
      readFile(resolve(repository, "bin/ui.js"), "utf8"),
    ]);
    expect(bin).toContain('import("../dist/foundation/release/index.js")');
    expect(bin).not.toContain("runOwnedUi");
    expect(guardian).toContain("runLaunchGuardian");
    expect(ui).toContain("runSelectedInteractiveRuntime");
    expect(ui).toContain("runOwnedUi");
    expect(`${bin}\n${guardian}\n${ui}`).not.toMatch(/node-pty|pi-tui|@xterm|host-terminal-renderer|terminal-input/);
    expect(`${bin}\n${guardian}\n${ui}`).not.toMatch(/Start-Process|wt\.exe|SendInput|SetForegroundWindow/);
  });

  it("carries selected launch identity without importing terminal implementation", async () => {
    const bootstrap = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    expect(bootstrap).toContain("options.launchIntent?.profile.id");
    expect(bootstrap).toContain("environment[PRODUCT_IDENTITY.environment.launchProfile] = launchProfileId");
    expect(bootstrap).not.toMatch(/foundation\/transparent-terminal/);
  });

  it("reuses an authenticated active cohort before deriving mutable package content", async () => {
    const bootstrap = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    const reuse = bootstrap.indexOf("await readCertifiedReleaseManifest");
    const materialization = bootstrap.indexOf("const candidate = await materializeRelease");
    expect(reuse).toBeGreaterThan(0);
    expect(materialization).toBeGreaterThan(reuse);
    expect(bootstrap).toContain('probe === "live-verified"');
    expect(bootstrap).toContain('active?.approval === "approved"');
  });

  it("keeps launch and update activation progress out of the user-facing terminal", async () => {
    const [bootstrap, update] = await Promise.all([
      readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8"),
      readFile(resolve(repository, "src/foundation/release/update.ts"), "utf8"),
    ]);
    // Launch says nothing about activation at all. Update may say how far along it
    // is, because the user asked for the update and waits on it — but only as the
    // percentage of its one progress bar, never as a file name or a running count.
    expect(bootstrap).not.toContain("onProgress:");
    expect(update).not.toMatch(/output\.std(?:out|err)\([^\n]*(?:event\.path|fileCount|completed|\btotal\b)/);
    expect(`${bootstrap}\n${update}`).not.toMatch(/installing .* files/);
  });

  it("keeps the dependency-light coordinator free of terminal implementation imports", async () => {
    const bootstrap = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    expect(bootstrap).not.toMatch(/from ["']\.\/(?:ui|supervisor|drivers|presentation)/);
    expect(bootstrap).not.toMatch(/node-pty|pi-tui|@xterm/);
  });
});
