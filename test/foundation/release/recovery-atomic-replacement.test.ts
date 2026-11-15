import { mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";

interface ReplacementOptions { platform: NodeJS.Platform; rename: (from: string, to: string) => Promise<void> }
const { atomicWrite, writeJson } = await import(pathToFileURL(resolve("bin/update-recovery.js")).href) as {
  atomicWrite(path: string, content: string, mode: number, options: ReplacementOptions): Promise<void>;
  writeJson(path: string, value: unknown, options: ReplacementOptions): Promise<void>;
};

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe("standalone recovery atomic replacement", () => {
  for (const kind of ["launcher", "sidecar"] as const) {
    it.each(["EPERM", "EACCES", "EBUSY"])(`retries ${kind} Windows %s without pre-deleting the destination`, async code => {
      const root = await mkdtemp(resolve(tmpdir(), "a1-recovery-atomic-"));
      roots.push(root);
      const path = resolve(root, "destination");
      await writeFile(path, "original");
      let attempts = 0;
      const options = { platform: "win32" as const, rename: async (from: string, to: string) => {
        expect(await readFile(to, "utf8")).toBe("original");
        if (++attempts < 3) throw Object.assign(new Error("sharing violation"), { code });
        await rename(from, to);
      } };
      if (kind === "launcher") await atomicWrite(path, "replacement", 0o755, options);
      else await writeJson(path, { replacement: true }, options);
      expect(await readFile(path, "utf8")).toContain("replacement");
      expect(attempts).toBe(3);
      expect(await readdir(root)).toEqual(["destination"]);
    });
    it(`preserves ${kind} after permanent Windows replacement refusal`, async () => {
      const root = await mkdtemp(resolve(tmpdir(), "a1-recovery-locked-"));
      roots.push(root);
      const path = resolve(root, "destination");
      await writeFile(path, "original");
      const options = { platform: "win32" as const, rename: async () => { throw Object.assign(new Error("locked"), { code: "EPERM" }); } };
      const operation = kind === "launcher" ? atomicWrite(path, "replacement", 0o755, options) : writeJson(path, {}, options);
      await expect(operation).rejects.toThrow("locked");
      expect(await readFile(path, "utf8")).toBe("original");
      expect(await readdir(root)).toEqual(["destination"]);
    });
  }
});
