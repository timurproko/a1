import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  REGISTRY_VERIFICATION_ATTEMPTS,
  REGISTRY_VERIFICATION_INTERVAL_MS,
  verifyPublishedPair,
} from "../../scripts/release/npm-registry-verification.mjs";

const version = "0.2.3-dev.657";
const channel = "next";
const bodies = ["application tarball bytes", "installer tarball bytes"];
const packages = ["@timurproko/a1", "@timurproko/a1-install"].map((name, index) => ({
  name,
  integrity: `sha512-${createHash("sha512").update(bodies[index]!).digest("base64")}`,
  shasum: createHash("sha1").update(bodies[index]!).digest("hex"),
}));
const tarballUrl = (package_: typeof packages[number]) => `https://registry.npmjs.org/${encodeURIComponent(package_.name)}/-/package.tgz`;

function successfulRegistry(overrides: {
  manifest?: (package_: typeof packages[number]) => unknown;
  tags?: (package_: typeof packages[number]) => unknown;
  tarball?: (package_: typeof packages[number]) => Response;
  tarballUrl?: string;
} = {}) {
  const calls: string[] = [];
  const fetch = async (input: string | URL) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    const package_ = [...packages].reverse().find(candidate => url.pathname.includes(encodeURIComponent(candidate.name)));
    if (!package_) return Response.json({ error: "unexpected package" }, { status: 404 });
    if (url.pathname.endsWith(".tgz")) return overrides.tarball?.(package_) ?? new Response(bodies[packages.indexOf(package_)]);
    if (url.pathname.endsWith("/dist-tags")) return Response.json(overrides.tags?.(package_) ?? { next: version });
    return Response.json(overrides.manifest?.(package_) ?? {
      name: package_.name,
      version,
      dist: { integrity: package_.integrity, shasum: package_.shasum, tarball: overrides.tarballUrl ?? tarballUrl(package_) },
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
      "/%40timurproko%2Fa1/-/package.tgz",
      `/%40timurproko%2Fa1-install/${version}`,
      "/-/package/%40timurproko%2Fa1-install/dist-tags",
      "/%40timurproko%2Fa1-install/-/package.tgz",
    ]);
    expect(calls).not.toContain("/%40timurproko%2Fa1");
  });

  it("retains the thirty-minute polling bound while exact resources converge", async () => {
    expect(REGISTRY_VERIFICATION_ATTEMPTS).toBe(180);
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

  it.each(packages.map(package_ => package_.name))("waits for %s tarball after metadata is ready", async name => {
    let downloads = 0;
    const sleeps: number[] = [];
    const { fetch } = successfulRegistry({ tarball: package_ => {
      if (package_.name === name && ++downloads === 1) return new Response("missing", { status: 404 });
      return new Response(bodies[packages.indexOf(package_)]);
    } });
    await expect(verifyPublishedPair({ packages, version, channel, fetch, attempts: 2, sleep: async ms => { sleeps.push(ms); }, report: () => {} })).resolves.toMatchObject({ version });
    expect(downloads).toBe(2);
    expect(sleeps).toEqual([10_000]);
  });

  it.each(["integrity", "shasum"])("independently checks downloaded %s", async digest => {
    const expected = packages.map(package_ => ({ ...package_, [digest]: digest === "integrity" ? "sha512-wrong" : "a".repeat(40) }));
    const { fetch } = successfulRegistry({ manifest: package_ => ({ ...package_, ...expected.find(candidate => candidate.name === package_.name), version,
      dist: { ...expected.find(candidate => candidate.name === package_.name), tarball: tarballUrl(package_) },
    }) });
    await expect(verifyPublishedPair({ packages: expected, version, channel, fetch, attempts: 1, report: () => {} })).rejects.toThrow(/downloaded bytes differ/u);
  });

  it.each([
    "https://example.com/package.tgz", "http://registry.npmjs.org/package.tgz",
    "https://user:secret@registry.npmjs.org/package.tgz", "https://registry.npmjs.org/package.tgz#fragment", "not a URL",
  ])("rejects unsafe tarball URL %s before fetching it", async url => {
    const { fetch, calls } = successfulRegistry({ tarballUrl: url });
    await expect(verifyPublishedPair({ packages, version, channel, fetch, attempts: 1, report: () => {} })).rejects.toThrow(/URL/u);
    expect(calls).toHaveLength(2);
  });

  it.each([
    ["redirect", () => new Response(null, { status: 302, headers: { location: "https://example.com" } }), /HTTP 302/u],
    ["absent", () => new Response("missing", { status: 404 }), /HTTP 404/u],
    ["wrong bytes", () => new Response("other bytes"), /downloaded bytes differ/u],
    ["declared oversized", () => new Response("x", { headers: { "content-length": "100" } }), /byte limit/u],
    ["streamed oversized", () => new Response("x".repeat(40)), /byte limit/u],
    ["empty body", () => new Response(null), /no response body/u],
    ["broken stream", () => new Response(new ReadableStream({ start(controller) { controller.error(new Error("interrupted")); } })), /interrupted/u],
  ] as const)("fails closed for %s tarball", async (_label, tarball, diagnostic) => {
    const { fetch } = successfulRegistry({ tarball });
    await expect(verifyPublishedPair({ packages, version, channel, fetch, attempts: 1, maxTarballBytes: 32, report: () => {} })).rejects.toThrow(diagnostic);
  });

  it("bounds a stalled download and disables redirects", async () => {
    const { fetch: ready } = successfulRegistry();
    const fetch = async (input: string | URL, init?: RequestInit) => {
      expect(init?.redirect).toBe("error");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      if (!String(input).endsWith(".tgz")) return ready(input);
      return new Response(new ReadableStream({ start(controller) {
        init!.signal!.addEventListener("abort", () => controller.error(init!.signal!.reason), { once: true });
      } }));
    };
    await expect(verifyPublishedPair({ packages, version, channel, fetch, attempts: 1, requestTimeoutMs: 20, report: () => {} })).rejects.toThrow(/abort|timeout/iu);
  });

  it("rejects malformed authority before contacting the registry", async () => {
    let calls = 0;
    const fetch = async () => { calls += 1; return Response.json({}); };
    await expect(verifyPublishedPair({ packages: packages.slice(0, 1), version, channel, fetch })).rejects.toThrow(/package pair/u);
    await expect(verifyPublishedPair({ packages, version, channel: "beta", fetch })).rejects.toThrow(/unsupported/u);
    expect(calls).toBe(0);
  });
});
