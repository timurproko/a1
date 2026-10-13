import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  OwnedSettingsManager,
  settingValue,
  type OwnedUiSettingDeclaration,
} from "../../../src/ui/settings/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

const PRODUCT_NAMESPACE = PRODUCT_IDENTITY.commandName;
const DECLARATIONS: readonly OwnedUiSettingDeclaration[] = [
  {
    id: "density",
    description: "Vertical density.",
    application: "live",
    defaultValue: "comfortable",
    allowedValues: ["comfortable", "compact"],
  },
  {
    id: "spacing",
    description: "Horizontal spacing.",
    application: "live",
    defaultValue: "wide",
    allowedValues: ["wide", "narrow"],
  },
];

let root: string;

function store(profileId = "a1"): OwnedSettingsManager {
  return new OwnedSettingsManager({ configDir: root, profileId, declarations: DECLARATIONS, migrations: [] });
}

async function write(target: OwnedSettingsManager, id: string, value: string | number | boolean): Promise<{ stored: boolean; failure: string | null }> {
  const outcome = await target.change("a1", id, value);
  return { stored: outcome.status === "applied" || outcome.status === "deferred", failure: outcome.failure };
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

describe("owned settings persistence", () => {
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

  it("stores a value that survives a fresh read", async () => {
    const first = store();
    expect(await write(first, "density", "compact")).toEqual({ stored: true, failure: null });
    expect(settingValue(store().read(), "density")).toBe("compact");
  });

  it("survives restart and replacement of update or reinstall trees", async () => {
    const profileDir = path.join(root, "home", ".a1", "agent");
    const installDir = path.join(root, "installation");
    mkdirSync(path.join(installDir, "release-a"), { recursive: true });
    const first = new OwnedSettingsManager({
      profileDir, namespace: PRODUCT_NAMESPACE, profileId: PRODUCT_NAMESPACE, declarations: DECLARATIONS, migrations: [],
    });
    expect((await write(first, "density", "compact")).stored).toBe(true);

    rmSync(installDir, { recursive: true, force: true });
    mkdirSync(path.join(installDir, "release-b"), { recursive: true });
    const restarted = new OwnedSettingsManager({
      profileDir, namespace: PRODUCT_NAMESPACE, profileId: PRODUCT_NAMESPACE, declarations: DECLARATIONS, migrations: [],
    });
    expect(settingValue(restarted.read(), "density")).toBe("compact");
    expect(restarted.file.startsWith(installDir)).toBe(false);
  });

  it("keeps profiles isolated", async () => {
    const agent = store(PRODUCT_NAMESPACE);
    const comparison = store("pi");
    expect((await write(agent, "density", "compact")).stored).toBe(true);
    expect(settingValue(comparison.read(), "density")).toBe("comfortable");
    expect(agent.file).toBe(comparison.file);
    expect(JSON.parse(readFileSync(agent.file, "utf8"))).toEqual({ [PRODUCT_NAMESPACE]: { density: "compact" } });
  });

  it("writes only under the configured root and leaves Pi profile trees untouched", async () => {
    const piProfile = path.join(root, "pi-profile-fixture");
    mkdirSync(piProfile, { recursive: true });
    writeFileSync(path.join(piProfile, "auth.json"), '{"token":"fixture"}\n', "utf8");
    const before = digestTree(piProfile);

    const target = store();
    expect((await write(target, "density", "compact")).stored).toBe(true);

    expect(digestTree(piProfile)).toEqual(before);
    expect(target.file.startsWith(path.resolve(root))).toBe(true);
    expect(path.relative(root, target.file)).toBe("settings.json");
  });

  it("omits declared defaults and removes an empty product object", async () => {
    const target = store();
    expect((await write(target, "density", "compact")).stored).toBe(true);
    expect((await write(target, "density", "comfortable")).stored).toBe(true);
    expect(JSON.parse(readFileSync(target.file, "utf8"))).toEqual({});
  });

  it("does not resurrect a stale value after another manager removes the product object", async () => {
    const seed = store();
    expect((await write(seed, "density", "compact")).stored).toBe(true);
    const stale = store();
    const remover = store();
    expect((await write(remover, "density", "comfortable")).stored).toBe(true);
    expect((await write(stale, "spacing", "narrow")).stored).toBe(true);
    expect(JSON.parse(readFileSync(stale.file, "utf8"))).toEqual({ [PRODUCT_NAMESPACE]: { spacing: "narrow" } });
  });

  it("preserves an unknown key across a write", async () => {
    const file = path.join(root, "settings.json");
    writeFileSync(file, `${JSON.stringify({ [PRODUCT_NAMESPACE]: { futureSetting: "keep me" } })}\n`, "utf8");

    const target = store();
    expect((await write(target, "density", "compact")).stored).toBe(true);

    const written = JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, unknown>>;
    expect(written[PRODUCT_NAMESPACE]?.["futureSetting"]).toBe("keep me");
    expect(written[PRODUCT_NAMESPACE]?.["density"]).toBe("compact");
  });

  it("imports the former standalone document lazily and leaves it unchanged", async () => {
    const profileDir = path.join(root, "profile");
    const legacyDir = path.join(root, "legacy");
    const legacyFile = path.join(legacyDir, "settings", `${PRODUCT_NAMESPACE}.json`);
    mkdirSync(path.dirname(legacyFile), { recursive: true });
    const legacyRaw = JSON.stringify({ version: 15, values: { density: "compact", futureSetting: "keep me" } });
    writeFileSync(legacyFile, legacyRaw);
    const target = new OwnedSettingsManager({
      profileDir, legacyConfigDir: legacyDir, namespace: PRODUCT_NAMESPACE, profileId: PRODUCT_NAMESPACE,
      declarations: DECLARATIONS, migrations: [],
    });

    expect(settingValue(target.read(), "density")).toBe("compact");
    expect(existsSync(target.file)).toBe(false);
    expect((await write(target, "density", "comfortable")).stored).toBe(true);
    expect(readFileSync(legacyFile, "utf8")).toBe(legacyRaw);
    expect(JSON.parse(readFileSync(target.file, "utf8"))).toEqual({ [PRODUCT_NAMESPACE]: { futureSetting: "keep me" } });
  });

  it("prefers a shared product object over the former standalone document", () => {
    const profileDir = path.join(root, "profile");
    const legacyDir = path.join(root, "legacy");
    mkdirSync(profileDir, { recursive: true });
    mkdirSync(path.join(legacyDir, "settings"), { recursive: true });
    writeFileSync(path.join(profileDir, "settings.json"), JSON.stringify({ [PRODUCT_NAMESPACE]: { density: "comfortable" } }));
    writeFileSync(path.join(legacyDir, "settings", `${PRODUCT_NAMESPACE}.json`), JSON.stringify({ version: 15, values: { density: "compact" } }));
    const target = new OwnedSettingsManager({
      profileDir, legacyConfigDir: legacyDir, namespace: PRODUCT_NAMESPACE, profileId: PRODUCT_NAMESPACE,
      declarations: DECLARATIONS, migrations: [],
    });
    expect(settingValue(target.read(), "density")).toBe("comfortable");
  });

  it("refuses an ambiguous compatibility shape without modifying the file", async () => {
    const file = path.join(root, "settings.json");
    const raw = JSON.stringify({ theme: "dark", [PRODUCT_NAMESPACE]: { quitEffect: "off", quitAnimation: true, future: "keep" } });
    writeFileSync(file, raw);
    const target = store();
    expect(target.read().notices[0]?.detail).toContain("conflicts");
    expect((await write(target, "density", "compact")).stored).toBe(false);
    expect(readFileSync(file, "utf8")).toBe(raw);
  });

  it("treats an unparseable file as absent, reports it, and preserves the file", () => {
    const file = path.join(root, "settings.json");
    writeFileSync(file, "{ not json", "utf8");

    const resolution = store().read();
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(resolution.notices.map(notice => notice.code)).toEqual(["document-unreadable"]);
    expect(resolution.notices[0]?.detail).toContain(file);
    expect(readFileSync(file, "utf8")).toBe("{ not json");
  });

  it("ignores a file above the size limit rather than parsing it", () => {
    const file = path.join(root, "settings.json");
    writeFileSync(file, JSON.stringify({ [PRODUCT_NAMESPACE]: { density: "compact", padding: "x".repeat(300_000) } }), "utf8");

    const resolution = store().read();
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(resolution.notices[0]?.detail).toContain("settings limit");
  });

  it("reports a failed store rather than claiming the change was saved", async () => {
    const target = store();
    // Platform: a directory at the target path cannot be replaced by rename.
    mkdirSync(path.join(root, "settings.json"), { recursive: true });

    const outcome = await write(target, "density", "compact");
    expect(outcome.stored).toBe(false);
    expect(outcome.failure).toContain("could not be written");
    expect(target.valueOf("density")).toBe("comfortable");
  });

  it("rejects an unknown setting and a disallowed value without writing", async () => {
    const target = store();
    expect(await write(target, "absentSetting", "compact")).toEqual({
      stored: false,
      failure: "unknown a1 setting: absentSetting",
    });
    expect((await write(target, "density", "enormous")).failure).toContain("is not allowed for density");
    expect(() => statSync(target.file)).toThrow();
  });

  it("leaves no temporary file behind after a successful write", async () => {
    const target = store();
    expect((await write(target, "density", "compact")).stored).toBe(true);
    expect(readdirSync(root)).toEqual(["settings.json"]);
  });

  it("keeps the previous document authoritative when a stray temporary file exists", async () => {
    const target = store();
    expect((await write(target, "density", "compact")).stored).toBe(true);
    writeFileSync(`${target.file}.999999.tmp`, "{ truncated", "utf8");
    expect(settingValue(store().read(), "density")).toBe("compact");
  });

  it("writes the settings file with owner-only permissions on Unix", async () => {
    if (process.platform === "win32") return;
    const target = store();
    expect((await write(target, "density", "compact")).stored).toBe(true);
    expect(statSync(target.file).mode & 0o777).toBe(0o600);
    chmodSync(target.file, 0o600);
  });
});
