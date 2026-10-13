import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { readProfileSettingsNamespace, updateProfileSettingsNamespace } from "../../../src/ui/settings/index.js";

const execFileAsync = promisify(execFile);
let root: string;
let file: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "profile-settings-document-"));
  file = join(root, "agent", "settings.json");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function json(): Record<string, unknown> {
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
}

describe("profile settings namespace document", () => {
  it("creates, replaces, and removes only the selected namespace", () => {
    updateProfileSettingsNamespace(file, "product", () => ({ accent: "cyan" }));
    expect(json()).toEqual({ product: { accent: "cyan" } });
    updateProfileSettingsNamespace(file, "product", current => ({ ...current, speed: "fast" }));
    expect(json()).toEqual({ product: { accent: "cyan", speed: "fast" } });
    updateProfileSettingsNamespace(file, "product", () => null);
    expect(json()).toEqual({});
    expect(readdirSync(join(root, "agent"))).toEqual(["settings.json"]);
  });

  it("rereads current root settings while locked and preserves unrelated writes", () => {
    mkdirSync(join(root, "agent"), { recursive: true });
    writeFileSync(file, JSON.stringify({ theme: "dark", product: { accent: "cyan" } }));
    updateProfileSettingsNamespace(file, "product", current => {
      expect(current).toEqual({ accent: "cyan" });
      return { ...current, speed: "fast" };
    });
    expect(json()).toEqual({ theme: "dark", product: { accent: "cyan", speed: "fast" } });
  });

  it("refuses malformed JSON and a non-object namespace without changing bytes", () => {
    mkdirSync(join(root, "agent"), { recursive: true });
    for (const raw of ["{ invalid", JSON.stringify({ theme: "dark", product: "collision" })]) {
      writeFileSync(file, raw);
      expect(() => updateProfileSettingsNamespace(file, "product", () => ({ accent: "cyan" }))).toThrow();
      expect(readFileSync(file, "utf8")).toBe(raw);
    }
  });

  it("leaves the complete previous file when the updater fails", () => {
    mkdirSync(join(root, "agent"), { recursive: true });
    const before = JSON.stringify({ theme: "dark", product: { accent: "cyan" } });
    writeFileSync(file, before);
    expect(() => updateProfileSettingsNamespace(file, "product", () => { throw new Error("interrupted"); })).toThrow("interrupted");
    expect(readFileSync(file, "utf8")).toBe(before);
    expect(readdirSync(join(root, "agent"))).toEqual(["settings.json"]);
  });

  it("is preserved by a pinned Pi write and preserves Pi root settings", async () => {
    updateProfileSettingsNamespace(file, "product", () => ({ accent: "cyan" }));
    const pi = SettingsManager.create(root, join(root, "agent"));
    pi.setTheme("dark");
    pi.setPackages(["example-package"]);
    await pi.flush();
    expect(json()).toEqual({ product: { accent: "cyan" }, theme: "dark", packages: ["example-package"] });

    updateProfileSettingsNamespace(file, "product", current => ({ ...current, speed: "fast" }));
    expect(json()).toEqual({
      product: { accent: "cyan", speed: "fast" }, theme: "dark", packages: ["example-package"],
    });
    pi.setPackages([]);
    await pi.flush();
    expect(json()).toEqual({ product: { accent: "cyan", speed: "fast" }, theme: "dark", packages: [] });
  });

  it("coordinates overlapping writes from product and pinned Pi processes", async () => {
    const moduleUrl = pathToFileURL(resolve("src/ui/settings/profile-document.ts")).href;
    const productScript = `
      import { updateProfileSettingsNamespace } from ${JSON.stringify(moduleUrl)};
      const file = ${JSON.stringify(file)};
      for (let index = 0; index < 20; index += 1) {
        updateProfileSettingsNamespace(file, "product", current => ({ ...current, marker: index }));
      }
    `;
    const piScript = `
      import { SettingsManager } from "@earendil-works/pi-coding-agent";
      const manager = SettingsManager.create(${JSON.stringify(root)}, ${JSON.stringify(join(root, "agent"))});
      for (let index = 0; index < 20; index += 1) {
        manager.setTheme(index % 2 === 0 ? "light" : "dark");
        await manager.flush();
      }
    `;
    await Promise.all([
      execFileAsync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", productScript], { cwd: process.cwd() }),
      execFileAsync(process.execPath, ["--input-type=module", "--eval", piScript], { cwd: process.cwd() }),
    ]);
    expect(json()).toMatchObject({ product: { marker: 19 }, theme: "dark" });
  }, 10_000);

  it("reports missing, available, malformed, and colliding namespaces", () => {
    expect(readProfileSettingsNamespace(file, "product")).toEqual({ status: "missing", value: null });
    mkdirSync(join(root, "agent"), { recursive: true });
    writeFileSync(file, JSON.stringify({ product: { accent: "cyan" } }));
    expect(readProfileSettingsNamespace(file, "product")).toEqual({ status: "available", value: { accent: "cyan" } });
    writeFileSync(file, "[]");
    expect(readProfileSettingsNamespace(file, "product")).toMatchObject({ status: "invalid", value: null });
    writeFileSync(file, JSON.stringify({ product: false }));
    expect(readProfileSettingsNamespace(file, "product")).toMatchObject({ status: "invalid", value: null });
  });
});
