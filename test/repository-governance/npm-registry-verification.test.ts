import { describe, expect, it } from "vitest";
import {
  REGISTRY_VERIFICATION_ATTEMPTS,
  REGISTRY_VERIFICATION_INTERVAL_MS,
  verifyPublishedPair,
} from "../../scripts/release/npm-registry-verification.mjs";

const version = "0.2.3-dev.657";
const channel = "next";
const packages = [
  { name: "@timurproko/a1", integrity: "sha512-application", shasum: "a".repeat(40) },
  { name: "@timurproko/a1-install", integrity: "sha512-installer", shasum: "b".repeat(40) },
] as const;

function successfulRegistry(overrides: {
  manifest?: (package_: typeof packages[number]) => unknown;
  tags?: (package_: typeof packages[number]) => unknown;
} = {}) {
  const calls: string[] = [];
  const fetch = async (input: string | URL) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    const package_ = [...packages].reverse().find(candidate => url.pathname.includes(encodeURIComponent(candidate.name)));
    if (!package_) return Response.json({ error: "unexpected package" }, { status: 404 });
    if (url.pathname.endsWith("/dist-tags")) return Response.json(overrides.tags?.(package_) ?? { next: version });
    return Response.json(overrides.manifest?.(package_) ?? {
      name: package_.name,
      version,
      dist: { integrity: package_.integrity, shasum: package_.shasum },
    });
  };
  return { calls, fetch };
}

describe("npm post-publication registry verification", () => {
  it("uses exact-version and dedicated dist-tag resources instead of the stale package-wide document", async () => {
    const { calls, fetch } = successfulRegistry();
    await expect(verifyPublishedPair({ packages, version, channel, fetch, attempts: 1 })).resolves.toEqual({
      version,
      channel,
      packages: packages.map(package_ => package_.name),
    });
    expect(calls).toEqual([
      `/%40timurproko%2Fa1/${version}`,
      "/-/package/%40timurproko%2Fa1/dist-tags",
      `/%40timurproko%2Fa1-install/${version}`,
      "/-/package/%40timurproko%2Fa1-install/dist-tags",
    ]);
    expect(calls).not.toContain("/%40timurproko%2Fa1");
  });

  it("retains the established ten-minute polling bound while exact resources converge", async () => {
    expect(REGISTRY_VERIFICATION_ATTEMPTS).toBe(60);
    expect(REGISTRY_VERIFICATION_INTERVAL_MS).toBe(10_000);
    const reports: string[] = [];
    const sleeps: number[] = [];
    let exactApplicationRequests = 0;
    const { fetch: ready } = successfulRegistry();
    const fetch = async (input: string | URL) => {
      const path = new URL(String(input)).pathname;
      if (path === `/%40timurproko%2Fa1/${version}` && ++exactApplicationRequests === 1) {
        return Response.json({ error: "ingesting" }, { status: 404 });
      }
      return await ready(input);
    };

    await expect(verifyPublishedPair({
      packages,
      version,
      channel,
      fetch,
      attempts: 2,
      intervalMs: REGISTRY_VERIFICATION_INTERVAL_MS,
      sleep: async duration => { sleeps.push(duration); },
      report: message => { reports.push(message); },
    })).resolves.toMatchObject({ version, channel });
    expect(reports).toEqual([`attempt 1/2: @timurproko/a1@${version} returned HTTP 404`]);
    expect(sleeps).toEqual([10_000]);
  });

  it.each([
    ["absent exact version", async () => Response.json({ error: "missing" }, { status: 404 }), /HTTP 404/u],
    ["malformed exact version", async () => new Response("{", { status: 200 }), /invalid JSON/u],
    ["wrong package identity", successfulRegistry({ manifest: package_ => ({ name: `${package_.name}-other`, version, dist: package_ }) }).fetch, /identity differs/u],
    ["wrong package version", successfulRegistry({ manifest: package_ => ({ name: package_.name, version: "9.9.9", dist: package_ }) }).fetch, /identity differs/u],
    ["wrong package digest", successfulRegistry({ manifest: package_ => ({ name: package_.name, version, dist: { integrity: "sha512-other", shasum: package_.shasum } }) }).fetch, /bytes differ/u],
    ["wrong requested tag", successfulRegistry({ tags: () => ({ next: "0.2.3-dev.656" }) }).fetch, /next tag differs/u],
  ])("fails closed for %s", async (_case, fetch, diagnostic) => {
    await expect(verifyPublishedPair({ packages, version, channel, fetch, attempts: 1, report: () => {} })).rejects.toThrow(diagnostic);
  });

  it("rejects malformed authority before contacting the registry", async () => {
    let calls = 0;
    const fetch = async () => { calls += 1; return Response.json({}); };
    await expect(verifyPublishedPair({ packages: packages.slice(0, 1), version, channel, fetch })).rejects.toThrow(/package pair/u);
    await expect(verifyPublishedPair({ packages, version, channel: "beta", fetch })).rejects.toThrow(/unsupported/u);
    expect(calls).toBe(0);
  });
});
