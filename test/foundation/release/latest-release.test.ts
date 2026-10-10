import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  UPDATE_CHECK_INTERVAL_MS,
  availableRelease,
  checkForNewerRelease,
  distTagsUrl,
  isNewerRelease,
  parseDistTags,
  releaseChannelOf,
  startupReleaseCheckSkipReason,
  type RegistryFetcher,
  type StartupReleaseCheckOptions,
} from "../../../src/foundation/release/latest-release.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const NOW = 1_800_000_000_000;

describe("release channel and comparison", () => {
  it.each([
    ["0.3.0", "stable"],
    ["0.3.1-dev.640", "development"],
    ["0.3.1-dev", null],
    ["0.3.1-beta.1", null],
    ["0.3.1-dev.01", null],
    ["newest", null],
  ] as const)("classifies %s as %s", (version, channel) => {
    expect(releaseChannelOf(version)).toBe(channel);
  });

  it.each([
    ["0.3.1", "0.3.0", true],
    ["0.3.0", "0.3.0", false],
    ["0.2.9", "0.3.0", false],
    ["0.3.1-dev.652", "0.3.1-dev.640", true],
    ["0.3.1-dev.9", "0.3.1-dev.10", false],
    ["garbage", "0.3.0", false],
    ["0.3.1", "garbage", false],
  ] as const)("treats %s over %s as newer: %s", (candidate, current, expected) => {
    expect(isNewerRelease(candidate, current)).toBe(expected);
  });

  it("names the channel's update command and links only stable releases", () => {
    expect(availableRelease("stable", "0.3.1")).toEqual({
      channel: "stable", version: "0.3.1", command: "a1 update",
      changelogUrl: "https://github.com/timurproko/a1/releases/tag/v0.3.1",
    });
    expect(availableRelease("development", "0.3.1-dev.652")).toEqual({
      channel: "development", version: "0.3.1-dev.652", command: "a1 update --develop", changelogUrl: null,
    });
  });

  it("parses dist-tags and builds registry URLs", () => {
    expect(parseDistTags({ latest: "1.0.0", next: "1.1.0-dev.2" }, "registry")).toEqual({ release: "1.0.0", develop: "1.1.0-dev.2", error: null });
    expect(parseDistTags({ latest: "1.0.0" }, "registry")).toEqual({ release: "1.0.0", develop: null, error: null });
    expect(parseDistTags({ next: "1.1.0-dev.2" }, "registry").error).toMatch(/registry latest/);
    expect(parseDistTags([], "registry").error).toMatch(/non-object/);
    expect(distTagsUrl()).toBe("https://registry.npmjs.org/-/package/%40timurproko%2Fa1/dist-tags");
    expect(distTagsUrl("https://mirror.example/npm/")).toBe("https://mirror.example/npm/-/package/%40timurproko%2Fa1/dist-tags");
  });
});

describe("startup release check", () => {
  it("reports a newer stable release and caches the answer atomically", async () => {
    const harness = await createHarness({ runningVersion: "0.3.0" });

    await expect(checkForNewerRelease(harness.options)).resolves.toMatchObject({ version: "0.3.1", command: "a1 update" });

    expect(harness.urls).toEqual(["https://registry.npmjs.org/-/package/%40timurproko%2Fa1/dist-tags"]);
    expect(JSON.parse(await readFile(join(harness.configDir, "update-check.json"), "utf8")))
      .toEqual({ version: 1, channel: "stable", latest: "0.3.1", checkedAt: NOW });
    expect(await readdir(harness.configDir)).toEqual(["update-check.json"]);
  });

  it("follows the development channel and never reports the stable release", async () => {
    const harness = await createHarness({ runningVersion: "0.3.1-dev.640" });
    await expect(checkForNewerRelease(harness.options)).resolves.toMatchObject({ version: "0.3.1-dev.652", command: "a1 update --develop", changelogUrl: null });

    const stableOnly = await createHarness({ runningVersion: "0.3.1-dev.640", tags: { latest: "0.4.0" } });
    await expect(checkForNewerRelease(stableOnly.options)).resolves.toBeNull();
  });

  it.each([["equal", "0.3.1"], ["lower", "0.3.0"]])("reports nothing when the channel head is %s", async (_label, latest) => {
    const harness = await createHarness({ runningVersion: "0.3.1", tags: { latest } });
    await expect(checkForNewerRelease(harness.options)).resolves.toBeNull();
  });

  it("answers from a fresh same-channel cache without querying the registry", async () => {
    const harness = await createHarness({ runningVersion: "0.3.0" });
    await writeFile(join(harness.configDir, "update-check.json"), JSON.stringify({ version: 1, channel: "stable", latest: "0.3.5", checkedAt: NOW - 60_000 }));

    await expect(checkForNewerRelease(harness.options)).resolves.toMatchObject({ version: "0.3.5" });
    expect(harness.urls).toEqual([]);
  });

  it.each([
    ["stale", { version: 1, channel: "stable", latest: "0.3.5", checkedAt: NOW - UPDATE_CHECK_INTERVAL_MS }],
    ["future", { version: 1, channel: "stable", latest: "0.3.5", checkedAt: NOW + 60_000 }],
    ["other-channel", { version: 1, channel: "development", latest: "0.3.5-dev.1", checkedAt: NOW }],
    ["unknown-version", { version: 2, channel: "stable", latest: "0.3.5", checkedAt: NOW }],
    ["malformed", "{not json"],
  ])("queries the registry instead of using a %s cache", async (_label, cache) => {
    const harness = await createHarness({ runningVersion: "0.3.0" });
    await writeFile(join(harness.configDir, "update-check.json"), typeof cache === "string" ? cache : JSON.stringify(cache));

    await expect(checkForNewerRelease(harness.options)).resolves.toMatchObject({ version: "0.3.1" });
    expect(harness.urls).toHaveLength(1);
  });

  it.each([
    ["an HTTP failure", async () => ({ ok: false, status: 503, text: async () => "" })],
    ["a timeout", async () => { throw new DOMException("The operation was aborted due to timeout", "TimeoutError"); }],
    ["malformed data", async () => ({ ok: true, status: 200, text: async () => "{\"latest\":\"newest\"}" })],
  ] as const)("stays silent and keeps the previous cache on %s", async (_label, fetcher) => {
    const harness = await createHarness({ runningVersion: "0.3.0", fetcher: fetcher as RegistryFetcher });
    const previous = JSON.stringify({ version: 1, channel: "stable", latest: "0.3.5", checkedAt: NOW - UPDATE_CHECK_INTERVAL_MS - 1 });
    await writeFile(join(harness.configDir, "update-check.json"), previous);

    await expect(checkForNewerRelease(harness.options)).resolves.toBeNull();
    expect(await readFile(join(harness.configDir, "update-check.json"), "utf8")).toBe(previous);
  });

  it("uses npm_config_registry for the startup query", async () => {
    const harness = await createHarness({ runningVersion: "0.3.0", environment: { npm_config_registry: "https://mirror.example/npm/" } });
    await checkForNewerRelease(harness.options);
    expect(harness.urls).toEqual(["https://mirror.example/npm/-/package/%40timurproko%2Fa1/dist-tags"]);
  });

  it.each([
    ["offline", { environment: { PI_OFFLINE: "1" } }],
    ["disabled-by-environment", { environment: { A1_SKIP_VERSION_CHECK: "true" } }],
    ["ci", { environment: { CI: "1" } }],
    ["not-interactive", { interactive: false }],
    ["disabled-by-setting", { settingEnabled: false }],
    ["unpublished-version", { runningVersion: "0.3.1-dev" }],
  ] as const)("skips before touching cache or network when %s", async (reason, overrides) => {
    const harness = await createHarness({ runningVersion: "0.3.0", ...overrides });
    await writeFile(join(harness.configDir, "update-check.json"), JSON.stringify({ version: 1, channel: "stable", latest: "0.3.5", checkedAt: NOW }));

    expect(startupReleaseCheckSkipReason(harness.options)).toBe(reason);
    await expect(checkForNewerRelease(harness.options)).resolves.toBeNull();
    expect(harness.urls).toEqual([]);
  });

  it.each(["", "0", "false", "FALSE"])("does not treat %j as an opt-out", async value => {
    const harness = await createHarness({ runningVersion: "0.3.0", environment: { A1_SKIP_VERSION_CHECK: value, CI: value, PI_OFFLINE: value } });
    expect(startupReleaseCheckSkipReason(harness.options)).toBeNull();
  });
});

async function createHarness(overrides: Partial<StartupReleaseCheckOptions> & { tags?: Record<string, string> } = {}) {
  const configDir = await mkdtemp(join(tmpdir(), "a1-latest-release-"));
  roots.push(configDir);
  const urls: string[] = [];
  const tags = overrides.tags ?? { latest: "0.3.1", next: "0.3.1-dev.652" };
  const fetcher: RegistryFetcher = overrides.fetcher ?? (async () => ({ ok: true, status: 200, text: async () => JSON.stringify(tags) }));
  const options: StartupReleaseCheckOptions = {
    runningVersion: "0.3.0",
    configDir,
    environment: {},
    interactive: true,
    settingEnabled: true,
    now: () => NOW,
    ...overrides,
    fetcher: async url => { urls.push(url); return await fetcher(url); },
  };
  return { options, configDir, urls };
}
