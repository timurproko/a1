import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  OwnedUiSettingsStore,
  settingValue,
  type OwnedUiSettingDeclaration,
} from "../../../src/ui/settings/index.js";

const DECLARATIONS: readonly OwnedUiSettingDeclaration[] = [
  {
    id: "density",
    description: "Vertical density.",
    application: "live",
    defaultValue: "comfortable",
    allowedValues: ["comfortable", "compact"],
  },
];

let root: string;

function store(profileId = "a1"): OwnedUiSettingsStore {
  return new OwnedUiSettingsStore({ configDir: root, profileId, declarations: DECLARATIONS, migrations: [] });
}

function digestTree(directory: string): readonly string[] {
  const entries: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else entries.push(`${path.relative(directory, full)}:${createHash("sha256").update(readFileSync(full)).digest("hex")}`);
    }
  };
  walk(directory);
  return entries;
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "a1-settings-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("owned UI settings store", () => {
  it("rejects a profile id that is not a bounded slug", () => {
    for (const profileId of ["", "A1", "../escape", "with space", "a".repeat(65)]) {
      expect(() => store(profileId)).toThrow(/bounded slug/);
    }
  });

  it("resolves defaults when no file exists and reports nothing", () => {
    const resolution = store().read();
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(resolution.notices).toHaveLength(0);
  });

  it("stores a value that survives a fresh read", () => {
    const first = store();
    expect(first.write(first.read(), "density", "compact")).toEqual({ stored: true, failure: null });
    expect(settingValue(store().read(), "density")).toBe("compact");
  });

  it("keeps profiles isolated", () => {
    const agent = store("a1");
    const comparison = store("pi");
    expect(agent.write(agent.read(), "density", "compact").stored).toBe(true);
    expect(settingValue(comparison.read(), "density")).toBe("comfortable");
    expect(agent.file).not.toBe(comparison.file);
  });

  it("writes only under the configured root and leaves Pi profile trees untouched", () => {
    const piProfile = path.join(root, "pi-profile-fixture");
    mkdirSync(piProfile, { recursive: true });
    writeFileSync(path.join(piProfile, "auth.json"), '{"token":"fixture"}\n', "utf8");
    const before = digestTree(piProfile);

    const target = store();
    expect(target.write(target.read(), "density", "compact").stored).toBe(true);

    expect(digestTree(piProfile)).toEqual(before);
    expect(target.file.startsWith(path.resolve(root))).toBe(true);
    expect(path.relative(root, target.file)).toBe(path.join("settings", "a1.json"));
  });

  it("preserves an unknown key across a write", () => {
    const file = path.join(root, "settings", "a1.json");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, '{"version":1,"values":{"futureSetting":"keep me"}}\n', "utf8");

    const target = store();
    expect(target.write(target.read(), "density", "compact").stored).toBe(true);

    const written = JSON.parse(readFileSync(file, "utf8")) as { values: Record<string, unknown> };
    expect(written.values["futureSetting"]).toBe("keep me");
    expect(written.values["density"]).toBe("compact");
  });

  it("treats an unparseable file as absent, reports it, and preserves the file", () => {
    const file = path.join(root, "settings", "a1.json");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, "{ not json", "utf8");

    const resolution = store().read();
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(resolution.notices.map(notice => notice.code)).toEqual(["document-unreadable"]);
    expect(resolution.notices[0]?.detail).toContain(file);
    expect(readFileSync(file, "utf8")).toBe("{ not json");
  });

  it("ignores a file above the size limit rather than parsing it", () => {
    const file = path.join(root, "settings", "a1.json");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ version: 1, values: { density: "compact", padding: "x".repeat(300_000) } }), "utf8");

    const resolution = store().read();
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(resolution.notices[0]?.detail).toContain("settings limit");
  });

  it("reports a failed store rather than claiming the change was saved", () => {
    const target = store();
    const settingsDir = path.join(root, "settings");
    mkdirSync(settingsDir, { recursive: true });
    // A directory at the target path cannot be replaced by rename.
    mkdirSync(path.join(settingsDir, "a1.json"), { recursive: true });

    const outcome = target.write(target.read(), "density", "compact");
    expect(outcome.stored).toBe(false);
    expect(outcome.failure).toContain("could not be written");
  });

  it("rejects an unknown setting and a disallowed value without writing", () => {
    const target = store();
    const resolution = target.read();
    expect(target.write(resolution, "absentSetting", "compact")).toEqual({
      stored: false,
      failure: "unknown owned UI setting: absentSetting",
    });
    expect(target.write(resolution, "density", "enormous").failure).toContain("is not allowed for density");
    expect(() => statSync(target.file)).toThrow();
  });

  it("leaves no temporary file behind after a successful write", () => {
    const target = store();
    expect(target.write(target.read(), "density", "compact").stored).toBe(true);
    expect(readdirSync(path.join(root, "settings"))).toEqual(["a1.json"]);
  });

  it("keeps the previous document authoritative when a stray temporary file exists", () => {
    const target = store();
    expect(target.write(target.read(), "density", "compact").stored).toBe(true);
    writeFileSync(`${target.file}.999999.tmp`, "{ truncated", "utf8");
    expect(settingValue(store().read(), "density")).toBe("compact");
  });

  it("writes the settings file with owner-only permissions on Unix", () => {
    if (process.platform === "win32") return;
    const target = store();
    expect(target.write(target.read(), "density", "compact").stored).toBe(true);
    expect(statSync(target.file).mode & 0o777).toBe(0o600);
    chmodSync(target.file, 0o600);
  });
});
