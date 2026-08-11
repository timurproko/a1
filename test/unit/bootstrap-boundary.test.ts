import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("mutable bootstrap boundary", () => {
  it("loads no UI, supervisor, PTY, TUI, or native-addon implementation", async () => {
    const bin = await readFile(resolve(repository, "bin/addone.js"), "utf8");
    expect(bin).toContain('import("../dist/src/bootstrap.js")');
    expect(bin).not.toMatch(/dist\/src\/(?:ui|supervisor|drivers|presentation)\//);
    expect(bin).not.toMatch(/node-pty|pi-tui|xterm/);

    const bootstrap = await readFile(resolve(repository, "src/bootstrap.ts"), "utf8");
    expect(bootstrap).not.toMatch(/from ["']\.\/(?:ui|supervisor|drivers|presentation)/);
    expect(bootstrap).not.toMatch(/node-pty|pi-tui|@xterm/);
  });
});
