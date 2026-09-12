import { posix, win32 } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { resolveLaunchProfilePaths, resolvePromptHistoryDataDir } from "../../../src/features/launch/index.js";
import { resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";
import { startupCompileCachePath } from "../../../src/foundation/startup/index.js";
import { resolvePromptHistoryPath } from "../../../src/features/prompt-history/index.js";

const platforms = [
  { platform: "win32" as const, home: "C:/Users/Example", path: win32 },
  { platform: "linux" as const, home: "/home/example", path: posix },
  { platform: "darwin" as const, home: "/Users/example", path: posix },
];

describe("prompt history root selection", () => {
  it.each(platforms)("uses the profile home rather than platform data on $platform", ({ platform, home, path }) => {
    const environment = { LOCALAPPDATA: path.join(home, "appdata"), XDG_DATA_HOME: path.join(home, "xdg-data") };
    const before = resolveProductPaths(environment, platform, home);
    const dataDir = resolvePromptHistoryDataDir({ environment, readHome: () => home, platform });
    expect(dataDir).toBe(path.join(home, ".a1", "data"));
    expect(resolveProductPaths(environment, platform, home)).toEqual(before);
    expect(before.dataDir).toBe(path.join(home, platform === "win32" ? "appdata" : "xdg-data", "a1"));
    expect(before.databasePath).toBe(path.join(before.dataDir, "control.sqlite3"));
    expect(before.runtimeDir).toBe(path.join(before.dataDir, "runtime"));
    expect(startupCompileCachePath(before.dataDir, "test-release", [])).toContain("cache");
    expect(startupCompileCachePath(before.dataDir, "test-release", [])).not.toContain(dataDir);
  });

  it.each(platforms)("honors A1_PROFILE_HOME on $platform", ({ platform, home, path }) => {
    const readHome = vi.fn(() => { throw new Error("OS home must not be read"); });
    expect(resolvePromptHistoryDataDir({ environment: { A1_PROFILE_HOME: home }, platform, readHome }))
      .toBe(path.join(home, ".a1", "data"));
    expect(readHome).not.toHaveBeenCalled();
    expect(resolvePromptHistoryDataDir({ environment: { A1_PROFILE_HOME: home }, home: path.join(home, "test-home"), platform }))
      .toBe(path.join(home, "test-home", ".a1", "data"));
  });

  it.each(platforms)("preserves explicit and relative data overrides on $platform", ({ platform, home, path }) => {
    for (const override of [path.join(home, "custom", "..", "history-data"), "relative-data", ""]) {
      const environment = { A1_PROFILE_HOME: "invalid-unused-home", A1_DATA_DIR: override };
      expect(resolvePromptHistoryDataDir({ environment, platform }))
        .toBe(resolveProductPaths(environment, platform).dataDir);
    }
  });

  it.each(platforms)("keeps profile identity independent of the selected storage root on $platform", ({ platform, home, path }) => {
    const profile = resolveLaunchProfilePaths({ home, platform, environment: {} }).agentProfile;
    const dataDir = resolvePromptHistoryDataDir({ home, platform, environment: {} });
    const location = resolvePromptHistoryPath(dataDir, profile, platform);
    const old = resolvePromptHistoryPath(path.join(home, "old-data"), profile, platform);
    expect(location.profileId).toBe(old.profileId);
    expect(path.basename(location.path)).toBe(path.basename(old.path));
    expect(location.path).toBe(path.join(home, ".a1", "data", "history", `${location.profileId}.sqlite3`));
    expect(resolvePromptHistoryPath(dataDir, path.join(home, "custom-profile"), platform).profileId).not.toBe(location.profileId);
  });
});
