import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("mutable bootstrap boundary", () => {
  it("keeps the retired interactive runtime unreachable during redesign", async () => {
    const bin = await readFile(resolve(repository, "bin/addone.js"), "utf8");
    expect(bin).toContain("terminal capability is unavailable during redesign");
    expect(bin).not.toContain('import("../dist/src/bootstrap.js")');
    expect(bin).not.toMatch(/dist\/src\/(?:ui|supervisor|drivers|presentation)\//);
    expect(bin).not.toMatch(/node-pty|pi-tui|xterm/);

    const stateRoot = await mkdtemp(resolve(tmpdir(), "addone-redesign-cli-"));
    const forbiddenImportLog = resolve(stateRoot, "forbidden-imports.log");
    const loader = resolve(stateRoot, "isolation-loader.mjs");
    await import("node:fs/promises").then(({ writeFile }) => writeFile(loader, `
import { appendFileSync } from "node:fs";
export async function resolve(specifier, context, nextResolve) {
  if (specifier.includes("/dist/src/bootstrap.js") || specifier.includes("/dist/src/ui/") || specifier.includes("/dist/src/supervisor/") || specifier.includes("/dist/src/drivers/") || specifier.includes("/dist/src/presentation/") || specifier === "node-pty" || specifier === "@xterm/headless") {
    appendFileSync(${JSON.stringify(forbiddenImportLog)}, specifier + "\\n");
    throw new Error("interactive launch imported retired runtime: " + specifier);
  }
  return nextResolve(specifier, context);
}
`, "utf8"));

    try {
      await expect(execFileAsync(process.execPath, [resolve(repository, "bin/addone.js")], {
        cwd: stateRoot,
        env: {
          ...process.env,
          ADDONE_DATA_DIR: resolve(stateRoot, "data-must-not-exist"),
          ADDONE_RUNTIME_DIR: resolve(stateRoot, "runtime-must-not-exist"),
          NODE_OPTIONS: `--no-warnings --experimental-loader=${pathToFileURL(loader).href}`,
        },
        timeout: 5_000,
      })).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining("AddOne terminal capability is unavailable during redesign"),
      });
      await expect(access(forbiddenImportLog)).rejects.toThrow();
      await expect(access(resolve(stateRoot, "data-must-not-exist"))).rejects.toThrow();
      await expect(access(resolve(stateRoot, "runtime-must-not-exist"))).rejects.toThrow();
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("keeps the dependency-light coordinator free of terminal implementation imports", async () => {
    const bootstrap = await readFile(resolve(repository, "src/bootstrap.ts"), "utf8");
    expect(bootstrap).not.toMatch(/from ["']\.\/(?:ui|supervisor|drivers|presentation)/);
    expect(bootstrap).not.toMatch(/node-pty|pi-tui|@xterm/);
  });
});
