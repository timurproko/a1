import { mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { reserveUserExport } from "../../../src/foundation/lifecycle/user-exports.js";

async function home() {
  const root = await mkdtemp(join(tmpdir(), "a1-export-home-"));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  return root;
}
afterEach(() => vi.unstubAllEnvs());

describe("persistent user exports", () => {
  it("uses the selected profile home, ignoring temporary development data and config", async () => {
    const root = await home();
    vi.stubEnv("A1_PROFILE_HOME", root);
    vi.stubEnv("A1_DATA_DIR", join(root, "temporary-data"));
    vi.stubEnv("A1_CONFIG_DIR", join(root, "temporary-config"));
    const selected = await reserveUserExport("session", "html");
    expect(selected.path.startsWith(join(root, ".a1", "exports"))).toBe(true);
    await selected.failed();
    await expect(reserveUserExport("session", "html", "relative-home")).rejects.toThrow("must be absolute");
  });

  it("reserves distinct files for repeated HTML/JSONL exports without overwriting", async () => {
    const root = await home();
    const first = await reserveUserExport("../same-session", "html", root);
    await writeFile(first.path, "original");
    const second = await reserveUserExport("../same-session", "html", root);
    const jsonl = await reserveUserExport("same-session", "jsonl", root);
    expect(second.path).not.toBe(first.path);
    expect(first.path).toMatch(/a1-session-.*same-session-.*\.html$/);
    expect(jsonl.path).toMatch(/\.jsonl$/);
    expect(await readFile(first.path, "utf8")).toBe("original");
    expect(await readdir(join(root, ".a1", "exports"))).toHaveLength(3);
    if (process.platform !== "win32") expect((await stat(second.path)).mode & 0o777).toBe(0o600);
  });

  it("removes only the original reservation after a failed export", async () => {
    const root = await home();
    const reserved = await reserveUserExport("session", "html", root);
    await reserved.failed();
    await reserved.failed();
    expect(await readdir(join(root, ".a1", "exports"))).toEqual([]);
    const replaced = await reserveUserExport("session", "html", root);
    await rename(replaced.path, `${replaced.path}.original`);
    await writeFile(replaced.path, "user replacement");
    await replaced.failed();
    expect(await readFile(replaced.path, "utf8")).toBe("user replacement");
  });
});
