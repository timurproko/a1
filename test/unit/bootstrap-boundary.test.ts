import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("mutable bootstrap boundary", () => {
  it("routes interactive launch only through bootstrap and the transparent broker", async () => {
    const [bin, ui] = await Promise.all([
      readFile(resolve(repository, "bin/addone.js"), "utf8"),
      readFile(resolve(repository, "bin/addone-ui.js"), "utf8"),
    ]);
    expect(bin).toContain('import("../dist/src/bootstrap.js")');
    expect(ui).toContain('import { runTransparentForeground } from "../dist/src/transparent/main.js"');
    expect(`${bin}\n${ui}`).not.toMatch(/node-pty|pi-tui|@xterm|host-terminal-renderer|terminal-input/);
    expect(`${bin}\n${ui}`).not.toMatch(/Start-Process|wt\.exe|SendInput|SetForegroundWindow/);
  });

  it("keeps the dependency-light coordinator free of terminal implementation imports", async () => {
    const bootstrap = await readFile(resolve(repository, "src/bootstrap.ts"), "utf8");
    expect(bootstrap).not.toMatch(/from ["']\.\/(?:ui|supervisor|drivers|presentation)/);
    expect(bootstrap).not.toMatch(/node-pty|pi-tui|@xterm/);
  });
});
