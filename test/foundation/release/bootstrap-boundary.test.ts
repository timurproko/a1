import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repository = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

describe("mutable bootstrap boundary", () => {
  it("publishes only the a1 executable", async () => {
    const manifest = JSON.parse(await readFile(resolve(repository, "package.json"), "utf8")) as { bin?: unknown };
    expect(manifest.bin).toEqual({ "a1": "bin/cli.js" });
  });

  it("routes interactive launch through bootstrap and starts the owned runtime lazily", async () => {
    const [bin, ui] = await Promise.all([
      readFile(resolve(repository, "bin/cli.js"), "utf8"),
      readFile(resolve(repository, "bin/ui.js"), "utf8"),
    ]);
    expect(bin).toContain('import("../dist/foundation/release/bootstrap.js")');
    expect(bin).not.toContain('import("../dist/foundation/release/index.js")');
    expect(bin).not.toContain("runOwnedUi");
    expect(ui).toContain("runSelectedInteractiveRuntime");
    expect(ui).toContain("runOwnedUi");
    expect(ui).toContain("terminateOwnedUiProcess");
    expect(`${bin}\n${ui}`).not.toMatch(/node-pty|pi-tui|@xterm|host-terminal-renderer|terminal-input/);
    expect(`${bin}\n${ui}`).not.toMatch(/Start-Process|wt\.exe|SendInput|SetForegroundWindow/);
  });

  it("starts the selected release's UI as the one attached child", async () => {
    const bootstrap = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    expect(bootstrap).toContain('resolveReleaseEntryPoint(release, "bin/ui.js")');
    expect(bootstrap).toContain('stdio: ["inherit", "inherit", "inherit", "ipc"]');
    expect(bootstrap).toContain("deliverExitNotice(noticePath");
    expect(bootstrap).toContain('"a1-release-reselection"');
    expect(bootstrap).not.toMatch(/detached:\s*true|supervisor|guardian|endpoint/i);
    expect(bootstrap).not.toMatch(/--no-warnings|NODE_NO_WARNINGS|disable-warning|process\.emitWarning|node:sqlite/);
  });

  it("carries selected launch identity without importing terminal implementation", async () => {
    const bootstrap = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    expect(bootstrap).toContain("options.launchIntent?.profileId");
    expect(bootstrap).toContain("withLaunchContext(options.environment ?? process.env");
    expect(bootstrap).not.toMatch(/foundation\/transparent-terminal/);
  });

  it("validates durable restart authority before deriving mutable package content", async () => {
    const bootstrap = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    const presenceCheck = bootstrap.indexOf("await assertCertifiedFilesPresent(active.releaseRoot)");
    const validationStart = bootstrap.indexOf('"durable-validation-start"');
    const restartRead = bootstrap.indexOf("await readRestartCertifiedRelease");
    const completeFallback = bootstrap.indexOf("await readMaterializedRelease(active.releaseRoot");
    const repair = bootstrap.indexOf("await repairApprovedRelease(options.packageRoot, active, paths.dataDir)", completeFallback);
    const materialization = bootstrap.indexOf("candidate = await materializeRelease");

    expect(presenceCheck).toBeGreaterThan(0);
    expect(validationStart).toBeGreaterThan(presenceCheck);
    expect(restartRead).toBeGreaterThan(validationStart);
    expect(completeFallback).toBeGreaterThan(restartRead);
    expect(repair).toBeGreaterThan(completeFallback);
    expect(materialization).toBeGreaterThan(repair);
    expect(bootstrap).toContain('active?.approval === "approved"');
  });

  it("keeps launch and update activation progress out of the user-facing terminal", async () => {
    const [bootstrap, update] = await Promise.all([
      readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8"),
      readFile(resolve(repository, "src/foundation/release/update.ts"), "utf8"),
    ]);
    // Invariant: launch says nothing about activation at all. Update may say how far along it
    // is, because the user asked for the update and waits on it — but only as the
    // percentage of its one progress bar, never as a file name or a running count.
    expect(bootstrap).not.toContain("onProgress:");
    expect(update).not.toMatch(/output\.std(?:out|err)\([^\n]*(?:event\.path|fileCount|completed|\btotal\b)/);
    expect(`${bootstrap}\n${update}`).not.toMatch(/installing .* files/);
  });

  it("schedules release cleanup at launch before selection without awaiting background deletion", async () => {
    const bootstrap = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    const schedule = bootstrap.indexOf("void scheduleMaintenance(paths.dataDir, paths)");
    const selection = bootstrap.indexOf("const activeId = state.references.active");

    expect(schedule).toBeGreaterThan(0);
    expect(selection).toBeGreaterThan(schedule);
    expect(bootstrap).not.toContain("await scheduleMaintenance(paths.dataDir, paths)");
  });

  it("keeps the dependency-light coordinator free of terminal implementation imports", async () => {
    const bootstrap = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    expect(bootstrap).not.toMatch(/from ["']\.\/(?:ui|supervisor|drivers|presentation)/);
    expect(bootstrap).not.toMatch(/node-pty|pi-tui|@xterm/);
  });
});
