import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyAcceptanceValidationRoute,
  inspectAcceptanceValidationRoute,
  routeAcceptanceValidationFromEnvironment,
  type AcceptanceRouteFile,
} from "../../scripts/governance/acceptance-validation-route.mjs";

const repository = "owner/repository";
const head = "a".repeat(40);
const base = "b".repeat(40);
const path = `openspec/acceptance/example-change/${head}.json`;
const event = { pull_request: { number: 42, head: { sha: head }, base: { sha: base } } };
const pull = {
  number: 42,
  state: "open",
  draft: false,
  changed_files: 1,
  base: { ref: "develop", sha: base },
  head: { sha: head, repo: { full_name: repository } },
};

function file(overrides: Partial<AcceptanceRouteFile> = {}): AcceptanceRouteFile {
  return { filename: path, status: "added", ...overrides };
}

function reader({ pullValue = pull, files = [file()] }: { pullValue?: typeof pull; files?: AcceptanceRouteFile[] } = {}) {
  return async (route: string) => {
    if (route === `/repos/${repository}/pulls/42`) return pullValue;
    if (route === `/repos/${repository}/pulls/42/files?per_page=100&page=1`) return files;
    throw new Error(`unexpected route: ${route}`);
  };
}

describe("acceptance validation route", () => {
  it("selects only one newly added canonical acceptance record", () => {
    expect(classifyAcceptanceValidationRoute([file()], 1)).toEqual({
      acceptanceOnly: true,
      reason: "exact-acceptance-record",
      path,
    });
    for (const files of [
      [file(), file({ filename: "docs/extra.md" })],
      [file({ status: "modified" })],
      [file({ status: "renamed", previous_filename: `openspec/acceptance/example-change/${"c".repeat(40)}.json` })],
      [file({ filename: `openspec/acceptance/Bad_Change/${head}.json` })],
      [file({ filename: `openspec/acceptance/example-change/${head.toUpperCase()}.json` })],
    ]) expect(classifyAcceptanceValidationRoute(files, files.length).acceptanceOnly).toBe(false);
    expect(classifyAcceptanceValidationRoute([file()], 2)).toMatchObject({ acceptanceOnly: false, reason: "incomplete-diff" });
  });

  it("binds routing to fresh same-repository pull metadata and the event head/base", async () => {
    await expect(inspectAcceptanceValidationRoute({ event, repository, request: reader() })).resolves.toMatchObject({
      acceptanceOnly: true,
      headSha: head,
      path,
    });
    await expect(inspectAcceptanceValidationRoute({ event, repository, request: reader({
      pullValue: { ...pull, head: { ...pull.head, sha: "c".repeat(40) } },
    }) })).rejects.toThrow("identity changed");
    await expect(inspectAcceptanceValidationRoute({ event, repository, request: reader({
      pullValue: { ...pull, changed_files: 2 },
    }) })).resolves.toMatchObject({ acceptanceOnly: false, reason: "incomplete-diff" });
  });

  it("falls back to generic validation when trusted route data is unavailable", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-acceptance-route-"));
    const eventPath = join(root, "event.json");
    const outputPath = join(root, "output.txt");
    await writeFile(eventPath, JSON.stringify(event));
    try {
      await expect(routeAcceptanceValidationFromEnvironment({
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_OUTPUT: outputPath,
        GITHUB_REPOSITORY: repository,
        GITHUB_TOKEN: "test-token",
      }, async () => new Response("unavailable", { status: 503 }))).resolves.toMatchObject({
        acceptanceOnly: false,
        headSha: head,
        reason: expect.stringContaining("generic-fallback"),
      });
      expect(await readFile(outputPath, "utf8")).toContain("acceptance_only=false");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails closed when paginated file data is unavailable or exceeds the bound", async () => {
    const hundred = Array.from({ length: 100 }, (_, index) => file({ filename: `docs/${index}.md` }));
    await expect(inspectAcceptanceValidationRoute({
      event,
      repository,
      request: async route => route.endsWith("/pulls/42") ? { ...pull, changed_files: 100 }
        : route.endsWith("page=1") ? hundred
          : Promise.reject(new Error("pagination unavailable")),
    })).rejects.toThrow("pagination unavailable");
    await expect(inspectAcceptanceValidationRoute({
      event,
      repository,
      request: async route => route.endsWith("/pulls/42") ? { ...pull, changed_files: 3000 } : hundred,
    })).rejects.toThrow("reviewable limit");
  });
});
