import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repository = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

describe("mutable bootstrap boundary", () => {
  it("keeps the supervisor internal while publishing only the a1 executable", async () => {
    const manifest = JSON.parse(await readFile(resolve(repository, "package.json"), "utf8")) as { bin?: unknown };
    expect(manifest.bin).toEqual({ "a1": "bin/a1.js" });
    await expect(readFile(resolve(repository, "bin/a1-supervisor.js"), "utf8")).resolves.toContain("runSupervisor");
  });

  it("routes interactive launch through bootstrap and selects the owned or transparent runtime lazily", async () => {
    const [bin, ui] = await Promise.all([
      readFile(resolve(repository, "bin/a1.js"), "utf8"),
      readFile(resolve(repository, "bin/a1-ui.js"), "utf8"),
    ]);
    expect(bin).toContain('import("../dist/src/foundation/release/index.js")');
    expect(bin).not.toContain("runOwnedUi");
    expect(ui).toContain("runSelectedInteractiveRuntime");
    expect(ui).toContain("runOwnedUi");
    expect(ui).toContain("runSelectedTransparentRuntime");
    const transparentComposition = await readFile(resolve(repository, "src/composition/transparent-runtime.ts"), "utf8");
    expect(transparentComposition).toContain("runTransparentForeground");
    expect(transparentComposition).not.toMatch(/features\/owned-ui|features\/workspace|composeOwnedUiApplication|pi-owned-ui-integration/);
    expect(`${bin}\n${ui}`).not.toMatch(/node-pty|pi-tui|@xterm|host-terminal-renderer|terminal-input/);
    expect(`${bin}\n${ui}`).not.toMatch(/Start-Process|wt\.exe|SendInput|SetForegroundWindow/);
  });

  it("carries selected launch identity without importing terminal implementation", async () => {
    const bootstrap = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    expect(bootstrap).toContain("options.launchIntent?.profile.id");
    expect(bootstrap).toContain("environment[PRODUCT_IDENTITY.environment.launchProfile] = launchProfileId");
    expect(bootstrap).not.toMatch(/foundation\/transparent-terminal/);
  });

  it("keeps the dependency-light coordinator free of terminal implementation imports", async () => {
    const bootstrap = await readFile(resolve(repository, "src/foundation/release/bootstrap.ts"), "utf8");
    expect(bootstrap).not.toMatch(/from ["']\.\/(?:ui|supervisor|drivers|presentation)/);
    expect(bootstrap).not.toMatch(/node-pty|pi-tui|@xterm/);
  });
});
