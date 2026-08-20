import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("A1 identity hard-cut documentation", () => {
  it("documents current paths, no migration, safe cleanup, and obsolete package status", async () => {
    const toolchain = await readFile("docs/architecture/toolchain.md", "utf8");

    for (const current of ["A1_CONFIG_DIR", "A1_DATA_DIR", "A1_RUNTIME_DIR", "A1_DATABASE_PATH", "A1_ENDPOINT", "%APPDATA%\\\\A1", "/a1"]) {
      expect(toolchain).toContain(current);
    }
    expect(toolchain).toContain("does not read or migrate legacy `ADDONE_*`");
    expect(toolchain).toContain("%APPDATA%\\\\AddOne");
    expect(toolchain).toContain("former `addone` directories");
    expect(toolchain).toContain("Do **not** remove `~/.a1/agent` or `~/.a1/sandbox`");
    expect(toolchain).toContain("`~/.pi/agent` remains");
    expect(toolchain).toContain("`@timurproko/addone` is deprecated");
    expect(toolchain).toContain("This package is obsolete. Use @timurproko/a1 instead.");
    expect(toolchain).toContain("unpublication was rejected by npm policy");
  });
});
