import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  UPDATE_CHECK_INTERVAL_MS,
  NOTIFY_CHECK_INTERVAL_MS,
  availableRelease,
  checkForNewerRelease,
  distTagsUrl,
  invalidateReleaseCheckCache,
  isNewerRelease,
  packageDocumentUrl,
  parseDistTags,
  parsePublishedVersions,
  queryPublishedVersions,
  recordedPullRequest,
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

  it("reads every published version with the pull request its manifest records", async () => {
    expect(packageDocumentUrl()).toBe("https://registry.npmjs.org/%40timurproko%2Fa1");
    expect(packageDocumentUrl("https://mirror.example/npm/")).toBe("https://mirror.example/npm/%40timurproko%2Fa1");
    expect(recordedPullRequest({ publication: { pullRequest: 828 } })).toBe(828);
    expect(recordedPullRequest({ publication: { pullRequest: "828" } })).toBeNull();
    expect(recordedPullRequest({ publication: { pullRequest: 0 } })).toBeNull();
    expect(recordedPullRequest({})).toBeNull();
    expect(recordedPullRequest(null)).toBeNull();

    const document = {
      name: "@timurproko/a1",
      versions: {
        "0.2.7-dev.835": { version: "0.2.7-dev.835" },
        "0.2.7-dev.1218": { version: "0.2.7-dev.1218", publication: { pullRequest: 828, source: "a".repeat(40) } },
        "not a version": {},
      },
    };
    expect(parsePublishedVersions(document)).toEqual({
      versions: [{ version: "0.2.7-dev.835", pullRequest: null }, { version: "0.2.7-dev.1218", pullRequest: 828 }],
      error: null,
    });
    expect(parsePublishedVersions([]).error).toMatch(/non-object/);
    expect(parsePublishedVersions({ versions: [] }).error).toMatch(/lists no versions/);

    const urls: string[] = [];
    const fetcher: RegistryFetcher = async url => { urls.push(url); return { ok: true, status: 200, text: async () => JSON.stringify(document) }; };
    await expect(queryPublishedVersions(fetcher, "https://mirror.example/npm")).resolves.toMatchObject({ error: null });
    expect(urls).toEqual(["https://mirror.example/npm/%40timurproko%2Fa1"]);
    await expect(queryPublishedVersions(async () => ({ ok: false, status: 503, text: async () => "" }))).resolves.toEqual({ versions: [], error: "registry responded with status 503" });
    await expect(queryPublishedVersions(async () => { throw new Error("offline"); })).resolves.toEqual({ versions: [], error: "offline" });
  });

  it("forgets the startup release check on request and tolerates an absent cache", async () => {
    const configDir = await mkdtemp(join(tmpdir(), "a1-release-cache-"));
    roots.push(configDir);
    await writeFile(join(configDir, "update-check.json"), JSON.stringify({ version: 1, channel: "development", latest: "0.2.7-dev.835", checkedAt: NOW }));
    await invalidateReleaseCheckCache(configDir);
    expect(await readdir(configDir)).toEqual([]);
    await expect(invalidateReleaseCheckCache(configDir)).resolves.toBeUndefined();
  });
});

describe("startup release check", () => {
  it("reports a newer stable release and caches the answer atomically", async () => {
    const harness = await createHarness({ runningVersion: "0.3.0" });

    await expect(checkForNewerRelease(harness.options)).resolves.toMatchObject({ version: "0.3.1", command: "a1 update" });

    expect(harness.urls).toEqual(["https://registry.npmjs.org/-/package/%40timurproko%2Fa1/dist-tags"]);
    expect(JSON.parse(await readFile(join(harness.configDir, "update-check.json"), "utf8")))
      .toEqual({ version: 2, stable: { latest: "0.3.1", checkedAt: NOW } });
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
    ["stale", { version: 1, channel: "stable", latest: "0.3.5", checkedAt: NOW - NOTIFY_CHECK_INTERVAL_MS }],
    ["future", { version: 1, channel: "stable", latest: "0.3.5", checkedAt: NOW + 60_000 }],
    ["other-channel", { version: 1, channel: "development", latest: "0.3.5-dev.1", checkedAt: NOW }],
    ["unknown-version", { version: 3, channel: "stable", latest: "0.3.5", checkedAt: NOW }],
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
    const previous = JSON.stringify({ version: 1, channel: "stable", latest: "0.3.5", checkedAt: NOW - NOTIFY_CHECK_INTERVAL_MS - 1 });
    await writeFile(join(harness.configDir, "update-check.json"), previous);

    await expect(checkForNewerRelease(harness.options)).resolves.toBeNull();
    expect(await readFile(join(harness.configDir, "update-check.json"), "utf8")).toBe(previous);
  });

  it("refreshes Auto after publication without restarting and preserves the other channel", async () => {
    const harness = await createHarness({ runningVersion: "0.3.1-dev.640", settingMode: "auto" });
    let clock = NOW;
    let next = "0.3.1-dev.640";
    const fetcher: RegistryFetcher = async () => ({ ok: true, status: 200,
      text: async () => JSON.stringify({ latest: "0.3.0", next }) });
    const options = { ...harness.options, now: () => clock, fetcher };
    expect(await checkForNewerRelease(options)).toBeNull();
    next = "0.3.1-dev.652";
    clock += UPDATE_CHECK_INTERVAL_MS - 1;
    expect(await checkForNewerRelease(options)).toBeNull();
    clock += 1;
    expect(await checkForNewerRelease(options)).toMatchObject({ version: next, channel: "development" });
    expect(JSON.parse(await readFile(join(harness.configDir, "update-check.json"), "utf8")))
      .toEqual({ version: 2, development: { latest: next, checkedAt: clock } });
    const stable = { ...options, runningVersion: "0.2.0" };
    expect(await checkForNewerRelease(stable)).toMatchObject({ version: "0.3.0", channel: "stable" });
    expect(JSON.parse(await readFile(join(harness.configDir, "update-check.json"), "utf8")))
      .toEqual({ version: 2, stable: { latest: "0.3.0", checkedAt: clock }, development: { latest: next, checkedAt: clock } });
  });

  it("schedules the next Auto probe at cache expiry instead of another full interval", async () => {
    const harness = await createHarness({ settingMode: "auto" });
    await writeFile(join(harness.configDir, "update-check.json"), JSON.stringify({ version: 1, channel: "stable",
      latest: "0.3.1", checkedAt: NOW - UPDATE_CHECK_INTERVAL_MS + 1_000 }));
    let delay: number | undefined;
    expect(await checkForNewerRelease({ ...harness.options, onNextCheckDelay: value => { delay = value; } }))
      .toMatchObject({ version: "0.3.1" });
    expect(delay).toBe(1_000);
    expect(harness.urls).toEqual([]);
  });

  it("does not publish a fetched result after the session is disposed", async () => {
    const harness = await createHarness({ settingMode: "auto" });
    const controller = new AbortController();
    const fetcher: RegistryFetcher = async () => {
      controller.abort();
      return { ok: true, status: 200, text: async () => JSON.stringify({ latest: "0.3.1", next: "0.3.1-dev.652" }) };
    };
    expect(await checkForNewerRelease({ ...harness.options, fetcher, signal: controller.signal })).toBeNull();
    await expect(readFile(join(harness.configDir, "update-check.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("serializes concurrent stale refreshes and keeps Notify on the 24-hour window", async () => {
    const harness = await createHarness({ settingMode: "auto" });
    await Promise.all(Array.from({ length: 6 }, () => checkForNewerRelease(harness.options)));
    expect(harness.urls).toHaveLength(1);
    const notify = { ...harness.options, settingMode: "notify" as const, now: () => NOW + UPDATE_CHECK_INTERVAL_MS };
    expect(await checkForNewerRelease(notify)).toMatchObject({ version: "0.3.1" });
    expect(harness.urls).toHaveLength(1);
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
    ["disabled-by-setting", { settingMode: "no" }],
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
    settingMode: "notify",
    now: () => NOW,
    ...overrides,
    fetcher: async url => { urls.push(url); return await fetcher(url); },
  };
  return { options, configDir, urls };
}
