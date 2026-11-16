import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { publishDevelopmentPreview } from "../../scripts/release/publication-client.mjs";

const version = "0.2.7-dev.1327";
const previous = "0.2.7-dev.1307";
const names = ["@timurproko/a1", "@timurproko/a1-install"] as const;
const preview = { source: "a".repeat(40), version, packageName: names[0], pullRequest: 955 };
type Pair = { versions: [boolean, boolean]; tags: [string | null, string | null] };
const complete: Pair = { versions: [true, true], tags: [version, version] };
const staged: Pair = { versions: [true, true], tags: [previous, previous] };

function fixture(initial: Pair = staged, final: Pair = complete, failure = false) {
  const output: string[] = [];
  let finished = false;
  let poll = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, options) => {
    const url = new URL(String(input));
    expect(options?.method ?? "GET").toBe("GET");
    expect(options?.headers).toMatchObject({ "cache-control": "no-cache" });
    const tags = url.pathname.startsWith("/-/package/");
    const name = decodeURIComponent(tags ? url.pathname.slice("/-/package/".length).split("/dist-tags")[0]! : url.pathname.slice(1, url.pathname.lastIndexOf("/")));
    const index = names.indexOf(name as typeof names[number]);
    expect(index).toBeGreaterThanOrEqual(0);
    const pair = finished ? final : initial;
    if (!tags) return pair.versions[index] ? Response.json({ name, version }) : new Response(null, { status: 404 });
    expect(options?.redirect).toBe("error");
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(url.searchParams.has("verify")).toBe(true);
    return Response.json(pair.tags[index] === null ? {} : { next: pair.tags[index] });
  });
  const job = () => ({
    id: 7, name: "Develop / Promote exercised pair to npm next", status: poll > 1 ? "completed" : "in_progress",
    conclusion: poll > 1 ? failure ? "failure" : "success" : null,
    steps: [{ status: poll > 1 ? "completed" : "in_progress", conclusion: null }],
  });
  const run = vi.fn((_executable: string, args: string[]) => {
    if (args[0] === "auth" || args[0] === "workflow") return "";
    if (args[0] === "run" && args[1] === "list") return JSON.stringify([{ databaseId: 42, displayTitle: "develop recovery fixture-request" }]);
    if (args[1] === "repos/owner/app/actions/runs/42") {
      poll++;
      finished = poll > 1 && !failure;
      return JSON.stringify({ status: poll > 1 ? "completed" : "in_progress", conclusion: poll > 1 ? failure ? "failure" : "success" : null });
    }
    if (args[1]?.includes("/jobs?")) return JSON.stringify([{ jobs: [job()] }]);
    if (args[1]?.includes("/annotations")) return JSON.stringify([[{ annotation_level: "failure", message: "npm next promotion returned HTTP 403" }]]);
    throw new Error(`unexpected GitHub command ${args.join(" ")}`);
  });
  const options = {
    fetch, run, repository: "owner/app", requestId: "fixture-request", sleep: async () => {}, isTTY: false,
    log: (text: string) => { output.push(`[develop] ${text}\n`); },
    write: (text: string) => { output.push(text); },
  };
  return { options, output, fetch, run, execute: () => publishDevelopmentPreview(preview, names[1], options) };
}

describe("development publication completion and recovery", () => {
  it("returns without dispatch only when both versions and both next tags are complete", async () => {
    const f = fixture(complete);
    await f.execute();
    expect(f.run).not.toHaveBeenCalled();
    expect(f.fetch).toHaveBeenCalledTimes(4);
    expect(f.output.join("")).toContain(`${version} already published for both packages on npm next (#955)`);
  });

  it.each<[string, Pair]>([
    ["staged only", staged],
    ["installer promoted first", { versions: [true, true], tags: [previous, version] }],
    ["application promoted alone", { versions: [true, true], tags: [version, previous] }],
    ["missing application next", { versions: [true, true], tags: [null, version] }],
    ["missing installer next", { versions: [true, true], tags: [version, null] }],
    ["missing application version", { versions: [false, true], tags: [previous, previous] }],
    ["missing installer version", { versions: [true, false], tags: [previous, previous] }],
  ])("recovers %s with the normal workflow, live progress, and final registry checks", async (_label, initial) => {
    const f = fixture(initial);
    await f.execute();
    expect(f.run.mock.calls.filter(([, args]) => args[0] === "workflow")).toEqual([["gh", [
      "workflow", "run", "develop.yml", "--ref", "develop", "-f", `source_sha=${preview.source}`, "-f", "request_id=fixture-request",
    ], expect.objectContaining({ timeout: 30_000 })]]);
    const output = f.output.join("");
    expect(output).toContain(`recovering ${version}`);
    expect(output).toContain("existing package bytes will be verified and exercised");
    expect(output).toContain(`[publication] ${version} — run 42`);
    expect(output).toContain("https://github.com/owner/app/actions/runs/42");
    expect(output).toContain("● Running: Promote exercised pair to npm next (1/1)");
    expect(output).toContain("● Passed:  Promote exercised pair to npm next (1/1)");
    expect(output).toContain(`  ● Passed:  Promote exercised pair to npm next (1/1)\n\n[workflow] passed; verifying npm packages.\n[develop] published ${version} on npm next (#955)\n`);
    expect(f.fetch).toHaveBeenCalledTimes(initial.versions.every(Boolean) ? 8 : 6);
  });

  it("requests fresh publication when neither version exists and verifies promotion afterward", async () => {
    const f = fixture({ versions: [false, false], tags: [null, null] });
    await f.execute();
    expect(f.output.join("")).toContain(`requesting ${version} for ${preview.source}`);
    expect(f.output.join("")).not.toContain("recovering");
    expect(f.output.join("")).toContain(`\n\n[workflow] passed; verifying npm packages.\n[develop] published ${version} on npm next (#955)\n`);
    expect(f.fetch).toHaveBeenCalledTimes(6);
  });

  it.each<[string, Pair, string]>([
    ["absent application", { ...complete, versions: [false, true] }, `${names[0]}@${version}`],
    ["absent installer", { ...complete, versions: [true, false] }, `${names[1]}@${version}`],
    ["old application tag", { ...complete, tags: [previous, version] }, `${names[0]} npm next names ${previous}`],
    ["old installer tag", { ...complete, tags: [version, previous] }, `${names[1]} npm next names ${previous}`],
    ["absent application tag", { ...complete, tags: [null, version] }, `${names[0]} npm next names no version`],
    ["absent installer tag", { ...complete, tags: [version, null] }, `${names[1]} npm next names no version`],
    ["advanced public tag", { ...complete, tags: ["0.2.7-dev.1400", version] }, `${names[0]} npm next names 0.2.7-dev.1400`],
  ])("does not claim success after workflow success with %s", async (_label, final, message) => {
    const f = fixture(staged, final);
    await expect(f.execute()).rejects.toThrow(message);
    expect(f.output.join("")).not.toContain(`[develop] published ${version}`);
  });

  it.each(["HTTP 403", "HTTP 503", "invalid tags", "invalid next", "unreadable JSON"])("fails closed on initial registry %s", async failure => {
    const f = fixture();
    f.fetch.mockImplementationOnce(async () => Response.json({ version }));
    f.fetch.mockImplementationOnce(async () => Response.json({ version }));
    f.fetch.mockImplementationOnce(async () => failure.startsWith("HTTP") ? new Response(null, { status: Number(failure.slice(-3)) })
      : failure === "unreadable JSON" ? new Response("not json") : Response.json(failure === "invalid tags" ? [] : { next: 1327 }));
    await expect(f.execute()).rejects.toThrow();
    expect(f.run).not.toHaveBeenCalled();
    expect(f.output).toEqual([]);
  });

  it("does not mistake an unavailable exact-version endpoint for an absent package", async () => {
    const f = fixture();
    f.fetch.mockImplementationOnce(async () => new Response(null, { status: 503 }));
    await expect(f.execute()).rejects.toThrow("HTTP 503");
    expect(f.run).not.toHaveBeenCalled();
  });

  it("rejects invalid exact-version identity before dispatch", async () => {
    const f = fixture();
    f.fetch.mockImplementationOnce(async () => Response.json({ version: previous }));
    await expect(f.execute()).rejects.toThrow(`npm returned ${previous}`);
    expect(f.run).not.toHaveBeenCalled();
  });

  it("retains promotion failure details and never treats staged versions as successful publication", async () => {
    const f = fixture(staged, complete, true);
    await expect(f.execute()).rejects.toThrow(/Publication failed[\s\S]*npm next promotion returned HTTP 403/u);
    expect(f.output.join("")).toContain("● Failed:  Promote exercised pair to npm next (1/1)");
    expect(f.output.join("")).not.toContain(`[develop] published ${version}`);
    expect(f.fetch).toHaveBeenCalledTimes(4);
  });

  it("preserves safe interruption and the remote run link during recovery", async () => {
    const f = fixture();
    const controller = new AbortController();
    await expect(publishDevelopmentPreview(preview, names[1], {
      ...f.options, signal: controller.signal, sleep: async () => { controller.abort(); },
    })).rejects.toThrow(/Stopped watching[\s\S]*Remote outcome unknown[\s\S]*actions\/runs\/42/u);
    expect(f.output.join("")).toContain("● Running: Promote exercised pair to npm next (1/1)");
    expect(f.output.join("")).not.toContain(`[develop] published ${version}`);
    expect(f.fetch).toHaveBeenCalledTimes(4);
  });

  it("surfaces registry verification failure even after a successful workflow", async () => {
    const f = fixture();
    for (let index = 0; index < 4; index++) {
      f.fetch.mockImplementationOnce(async () => Response.json(index < 2 ? { version } : { next: previous }));
    }
    f.fetch.mockImplementationOnce(async () => new Response(null, { status: 503 }));
    await expect(f.execute()).rejects.toThrow("HTTP 503");
    expect(f.output.join("")).not.toContain(`[develop] published ${version}`);
  });

  it("routes the develop entry through pair completion instead of an existence-only early return", async () => {
    const entry = await readFile("scripts/development/develop.mjs", "utf8");
    expect(entry).toContain("await publishDevelopmentPreview(preview, installer.name)");
    expect(entry).not.toContain("registryVersion");
  });
});
